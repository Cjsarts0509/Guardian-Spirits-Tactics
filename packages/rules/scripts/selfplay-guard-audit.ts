/** Post-choice observer only. Replays every 12-player primordial ownOutcome fixture;
 * no policy change, no new research samples, no hidden assignment in the opportunity test. */
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deepStrictEqual,strictEqual} from 'node:assert';
import {smartBotAction,botCommunicationAction,botKnowledge,viewFor,type Action} from '../src/index.js';
import {playMatch,type Policy} from './league-runner.js';
import {type playSelfplay} from './selfplay-balance.js';

const input=process.argv[2],out=process.argv[3];
if(!input||!out)throw Error('usage: selfplay-guard-audit.ts selfplay.json[.gz] output.json');
const raw=readFileSync(input),bytes=input.endsWith('.gz')?gunzipSync(raw):raw;
const source=JSON.parse(bytes.toString()) as {complete:boolean;start:number;count:number;fingerprint:string;settings:Parameters<typeof playMatch>[2];records:ReturnType<typeof playSelfplay>[]};
strictEqual(source.complete,true);strictEqual(source.start,147000);strictEqual(source.count,80);
const selected=source.records.filter(r=>r.variant==='ownOutcome'&&r.game.fixture.mode==='primordial'&&r.game.fixture.count===12);
strictEqual(selected.length,32);
const guards={consume:{skill:'consume_master_guard',target:'eltas'},kumarin:{skill:'kumarin_commander_guard',target:'rael'}} as const;
const records=[];
for(const original of selected){
 const decisions:Array<{at:number;actor:string;character:string;mana:number;skill:string;action:Action;reason:string;knownTarget:string|null;eligible:boolean;selectedGuard:boolean}>=[];
 const receipts:Array<{at:number;actor:string;skill:string;target:string|null;accepted:boolean;success:boolean;wrongTarget:boolean}>=[];
 const options={learnOwnAttackOutcome:true};
 const policy:Policy=(s,id,m,o)=>{
  const action=smartBotAction(s,id,m,{...o,...options});
  if(!action)return action;
  const view=viewFor(s,id),def=guards[view.me.character as keyof typeof guards];
  if(!def)return action;
  const skill=view.me.skills.find(x=>x.key===def.skill);
  if(!skill||skill.usesLeft===0)return action;
  // Read only the acting player's view/events and a copy of their post-choice memory.
  // Assert that observation cannot modify the live engine or the real bot memory.
  const beforeMemory=structuredClone(m),beforeState=structuredClone(s);
  const known=botKnowledge(s,id,view,structuredClone(m),options).known;
  deepStrictEqual(m,beforeMemory);deepStrictEqual(s,beforeState);
  const target=view.players.find(p=>known.get(p.id)===def.target);
  const ready=!skill.passive&&skill.blocked===null&&skill.cooldownRemainingMs===0&&view.me.mana>=skill.mana;
  const reason=!ready?'skill_unavailable':!target?'identity_unconfirmed':!target.alive?'target_dead':
   !skill.ignoresInvulnerable&&target.statuses.some(x=>x.kind==='invulnerable')?'target_invulnerable':'eligible';
  decisions.push({at:view.elapsedMs,actor:id,character:view.me.character,mana:view.me.mana,skill:def.skill,action,
   reason,knownTarget:target?.id??null,eligible:reason==='eligible',selectedGuard:action.type==='skill'&&action.skill===def.skill&&action.target===target?.id});
  return action;
 };
 const chat:Policy=(s,id,m,o)=>botCommunicationAction(s,id,m,{...o,...options});
 const roles:ReturnType<typeof playSelfplay>['roles']=[];
 const skills:ReturnType<typeof playSelfplay>['skills']={};
 const game=playMatch(original.game.fixture,{current:policy,reference:policy},source.settings,(s,id,a,r)=>{
  if(a.type!=='skill')return;
  const role=s.players.find(p=>p.id===id)!.character;
  const cell=(skills[role]??={})[a.skill]??={attempts:0,accepted:0,failedAttacks:0};
  cell.attempts++;cell.accepted+=Number(r.ok);cell.failedAttacks+=Number(r.events.some(e=>e.kind==='attack.fail.self'||e.kind==='attack.fail.death'));
  if(Object.values(guards).some(d=>d.skill===a.skill))receipts.push({at:s.now-s.startedAt,actor:id,skill:a.skill,target:a.target??null,
   accepted:r.ok,success:r.events.some(e=>e.kind==='skill.'+a.skill),wrongTarget:r.events.some(e=>e.kind==='skill.'+a.skill+'.fail')});
 },{current:chat,reference:chat},s=>{if(!roles.length)for(const p of s.players)roles.push({id:p.id,character:p.character,side:p.side});});
 // All persisted game output, role assignment and skill counts must match the original.
 deepStrictEqual({variant:'ownOutcome',game,roles,skills},original);
 records.push({fixture:game.fixture,winner:game.winner,elapsedMs:game.elapsedMs,decisions,receipts,originalEntireRecordMatched:true});
}
const summary:Record<string,unknown>={};
for(const [character,def] of Object.entries(guards)){
 const ds=records.flatMap(r=>r.decisions.filter(d=>d.character===character));
 const eligible=ds.filter(d=>d.eligible),receipts=records.flatMap(r=>r.receipts.filter(x=>x.skill===def.skill));
 const deferred:Record<string,number>={},reasons:Record<string,number>={};
 for(const d of ds)reasons[d.reason]=(reasons[d.reason]??0)+1;
 for(const d of eligible.filter(d=>!d.selectedGuard)){const key=d.action.type==='skill'?d.action.skill:d.action.type;deferred[key]=(deferred[key]??0)+1;}
 const episodes=records.map(r=>{const e=r.decisions.find(d=>d.character===character&&d.eligible),receipt=r.receipts.find(x=>x.skill===def.skill);
  return {fixture:r.fixture,winner:r.winner,firstEligibleAt:e?.at??null,guardAt:receipt?.at??null,success:receipt?.success??false,
   delayMs:e&&receipt?receipt.at-e.at:null};});
 summary[character]={games:records.length,decisionReasons:reasons,eligibleDecisions:eligible.length,
  selectedAtEligibleDecision:eligible.filter(d=>d.selectedGuard).length,deferredActions:deferred,
  gamesWithEligibleOpportunity:episodes.filter(e=>e.firstEligibleAt!==null).length,
  eligibleGamesEventuallyProtected:episodes.filter(e=>e.firstEligibleAt!==null&&e.success).length,
  guardAttempts:receipts.length,guardSuccesses:receipts.filter(x=>x.success).length,guardWrongTargets:receipts.filter(x=>x.wrongTarget).length,episodes};
}
const result={kind:'selfplay-postchoice-guard-audit',sourceSHA256:createHash('sha256').update(bytes).digest('hex'),
 observerSourceSHA256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
 sourceFingerprint:source.fingerprint,optionsSHA256:createHash('sha256').update(JSON.stringify({learnOwnAttackOutcome:true})).digest('hex'),
 policySourceRef:'7a05fcf8be4017ac51f2bdebbd8437153dd7ec98',researchExecutions:0,replayedGames:records.length,
 observerEntireRecordMatches:records.length,liveStateAndMemoryUnchanged:true,summary,records,
 limitations:['Active decisions only; inactive polling is not an actionable opportunity.',
 'Ready and confirmed guards may compete with valid offensive actions; a deferral is not automatically a mistake.',
 'Commander defeat and subsequent wins are associations, not a causal effect of guarding earlier.',
 'Replay of development material, excluded from new research sample count.']};
writeFileSync(out,JSON.stringify(result,null,2));
console.log(JSON.stringify({replayedGames:records.length,summary},null,2));
