/** Finite comparison against the complete pinned main policy, including its own memory modules. */
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {deepStrictEqual,strictEqual} from 'node:assert';
import {advance,applyAction,smartBotAction,botCommunicationAction,updateBotKnowledge,viewFor,createBotMemory,
 type Action,type BotMemory,type GameState} from '../src/index.js';
import {observeBotActionResult} from '../src/bot-retry.js';
import {prepareMatch,DEFAULT_SETTINGS,type Fixture,type Settings} from './league-runner.js';
import {FAILURE_OPTIONS} from './failure-development.js';

export const COMPARISON_OPTIONS=FAILURE_OPTIONS.candidate;
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x,(_k,v)=>v instanceof Map?{$map:[...v]}:v instanceof Set?{$set:[...v]}:v)).digest('hex');
export async function loadPinnedMain(directory:string){
 const mod=async(file:string)=>import(pathToFileURL(resolve(directory,'packages/rules/src',file)).href);
 return {bot:await mod('bot.ts'),memory:await mod('bot-memory.ts'),retry:await mod('bot-retry.ts')};
}
type Main=Awaited<ReturnType<typeof loadPinnedMain>>;
export function playMainComparison(fixture:Fixture,main:Main,observe=true,settings:Settings=DEFAULT_SETTINGS){
 const {state,controllers,memories}=prepareMatch(fixture);
 for(const p of state.players){const seed=(fixture.seed*8191+p.slot*997+77)|0;
  deepStrictEqual(createBotMemory(seed),main.memory.createBotMemory(seed));
  if(controllers.get(p.id)==='reference')memories.set(p.id,main.memory.createBotMemory(seed));}
 const policyOf=(id:string)=>controllers.get(id)==='current'?'candidate':'main';
 const fresh=()=>({attempted:0,accepted:0,rejected:0,skillMana:0,immediateManaDelta:0,attackFailures:0,
  reports:0,wrongReportNames:0,unsupportedReports:0,reportToUnknownOrEnemy:0,knownChecks:0,wrongKnown:0,
  candidateChecks:0,truthExcluded:0,acceptedAllies:0,enemyAllies:0,knownEnemyAllies:0,delayedReceipts:0,delayedResults:0,
  failedResultsConsumed:0,skills:{} as Record<string,number>});
 const stats={candidate:fresh(),main:fresh()},actions:any[]=[],knowledgeAudits:any[]=[],seenFailures=new Set<string>();
 const actionTrace=createHash('sha256');
 const run=(id:string,stage:'primary'|'chat')=>{
  const current=policyOf(id)==='candidate',m=memories.get(id)!,before=observe?viewFor(state,id):null;
  const a:Action|null=stage==='primary'?(current?smartBotAction(state,id,m,{activity:settings.activity,...COMPARISON_OPTIONS}):main.bot.smartBotAction(state,id,m,{activity:settings.activity})):
   current?botCommunicationAction(state,id,m,{activity:settings.activity,...COMPARISON_OPTIONS}):null;
  // Only after the original choice: private grading stays outside both policies and their memories.
  let k:any=null;
  if(observe&&before&&m.perception?.lastElapsedMs===before.elapsedMs&&state.phase==='running'&&before.me.alive){
   const copy=structuredClone(m),source=current?updateBotKnowledge:main.memory.updateBotKnowledge;
   k=source(before,[],copy,current?COMPARISON_OPTIONS:{});
   if(stage==='primary'){
    const counters=stats[policyOf(id)];
    for(const [target,name] of k.known){counters.knownChecks++;counters.wrongKnown+=Number(state.players.find(p=>p.id===target)!.character!==name);}
    for(const [target,names] of k.candidates){counters.candidateChecks++;counters.truthExcluded+=Number(!names.includes(state.players.find(p=>p.id===target)!.character));}
    for(const rec of m.perception?.ownDelayedChecks?.records??[]){const key=id+':'+rec.receiptSeq;
     if(rec.status==='failed'&&!seenFailures.has(key)){seenFailures.add(key);counters.failedResultsConsumed++;}}
    knowledgeAudits.push({actor:id,policy:policyOf(id),at:before.elapsedMs,known:[...k.known],candidates:[...k.candidates],
     failedReceiptSeqs:(m.perception?.ownDelayedChecks?.records??[]).filter(r=>r.status==='failed').map(r=>r.receiptSeq)});
   }
  }
  if(!a)return;
  const pre=before??viewFor(state,id),result=applyAction(state,id,a,state.now),after=viewFor(state,id),c=stats[policyOf(id)];
  (current?observeBotActionResult:main.retry.observeBotActionResult)(m,a,result,state.now-state.startedAt);
  c.attempted++;if(result.ok)c.accepted++;else c.rejected++;
  if(result.ok&&a.type==='skill'){c.skillMana+=pre.me.skills.find(s=>s.key===a.skill)?.mana??0;c.immediateManaDelta+=after.me.mana-pre.me.mana;c.skills[a.skill]=(c.skills[a.skill]??0)+1;}
  c.attackFailures+=Number(result.events.some(e=>e.kind==='attack.fail.self'));
  c.delayedReceipts+=result.events.filter(e=>e.kind==='skill.chaos_hex.self'&&e.vis.to==='players'&&e.vis.ids.includes(id)).length;
  let reportTarget:string|null=null,reportedName:string|null=null;
  const match=a.type==='chat'?/^확인 정보: \[(\d{1,2})\] (.+)$/.exec(a.text):null;
  if(result.ok&&match){
   reportTarget=pre.players.find(p=>p.seat===Number(match[1]))?.id??null;reportedName=pre.roster.find(p=>p.name===match[2])?.key??null;c.reports++;
   c.wrongReportNames+=Number(!reportTarget||state.players.find(p=>p.id===reportTarget)?.character!==reportedName);
   c.unsupportedReports+=Number(!reportTarget||k?.known.get(reportTarget)!==reportedName);
   const recipient=a.type==='chat'?a.to:undefined,known=recipient?k?.known.get(recipient):null;
   c.reportToUnknownOrEnemy+=Number(!known||pre.roster.find(r=>r.key===known)?.side!==pre.me.side);
  }
  if(result.ok&&a.type==='skill'&&a.skill==='ally'){
   c.acceptedAllies++;const enemy=state.players.find(p=>p.id===a.target)?.side!==pre.me.side;
   c.enemyAllies+=Number(enemy);c.knownEnemyAllies+=Number(enemy&&!!k?.known.get(a.target));
  }
  const row={ordinal:actions.length,at:pre.elapsedMs,actor:id,policy:policyOf(id),stage,action:a,accepted:result.ok,error:result.ok?null:result.error,
   beforeMana:pre.me.mana,afterMana:after.me.mana,nominalMana:a.type==='skill'?pre.me.skills.find(s=>s.key===a.skill)?.mana??0:0,
   receiptKinds:result.events.map(e=>e.kind),reportTarget,reportedName,
   ownKnown:observe&&k?[...k.known]:null,ownView:observe?pre:null};
  actionTrace.update(JSON.stringify([id,state.now,stage,a,result]));actions.push(row);
 };
 for(let now=settings.tickMs;state.phase==='running'&&now<=settings.limitMs;now+=settings.tickMs){
  advance(state,now);
  for(const p of state.players){if(state.phase!=='running')break;if(!p.alive)continue;run(p.id,'primary');if(state.phase==='running')run(p.id,'chat');}
 }
 if(observe)for(const e of state.log)if(e.kind==='skill.chaos_hex.result'&&e.vis.to==='players'&&e.vis.ids.length===1)stats[policyOf(e.vis.ids[0]!)].delayedResults++;
 return {fixture,winner:state.winner,winnerPolicy:state.winner===null?null:state.winner===fixture.currentSide?'candidate':'main',
  elapsedMs:state.now,reason:state.endReason??'simulation_limit',stats,actions,knowledgeAudits,
  survivors:state.players.map(p=>({id:p.id,character:p.character,side:p.side,alive:p.alive,policy:policyOf(p.id)})),
  actionTraceSHA256:actionTrace.digest('hex'),finalStateSHA256:hash(state),finalMemoriesSHA256:hash(memories)};
}
