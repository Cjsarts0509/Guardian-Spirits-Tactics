/** Same-moment probes only. Candidate memory/actions never enter the actual replay. */
import {deepStrictEqual,strictEqual,ok} from 'node:assert';
import {smartBotAction,botCommunicationAction,eventsFor,viewFor,updateBotKnowledge,serializeHostMemories,applyAction,
  type BotMemory,type PlayerView,type Action} from '../src/index.js';
import {smartBotAction as previous} from './baselines/pre-cooperative.js';
import {opponentClaim} from './claim-opponents.js';
import {SENDER_OPTIONS} from './sender-development.js';
import {playMatch,type Settings,type Policy} from './league-runner.js';
import {hash,type Record055} from './troll-regression-replay.js';
type Original=Pick<Record055,'fixture'|'style'|'variant'|'game'|'actions'>;
export const FAILURE_FACTION_OPTIONS={rememberOwnDelayedCheck:true,learnOwnDelayedFailureFaction:true};
export function failureProbe061(original:Original,settings:Settings,prior:any,observe=true){
  const wanted=new Map<string,any[]>(),key=(id:string,at:number,stage:string)=>`${id}:${at}:${stage}`;
  for(const e of prior.episodes)if(e.firstResultSeen?.record.status==='failed'){
    const k=key(e.actor,e.firstResultSeen.at,e.firstResultSeen.stage);wanted.set(k,[...(wanted.get(k)??[]),e]);
  }
  const rows:any[]=[],seen=new Set<string>(),views=new Map<string,PlayerView>(),actions:any[]=[];
  const common=original.variant==='candidate'?SENDER_OPTIONS:{};
  const remember=(s:Parameters<Policy>[0],id:string,a:Action|null)=>{if(a)views.set(id,viewFor(s,id));return a;};
  const wrap=(fn:Policy,stage:string):Policy=>(s,id,m,o)=>{
    const k=key(id,s.now-s.startedAt,stage),expected=wanted.get(k),pre=observe&&expected?structuredClone(m):null;
    const view=pre?viewFor(s,id):null,events=pre?eventsFor(s,id,pre.perception?.lastSeq??0).filter(e=>e.vis.to==='all'||e.vis.to==='players'&&e.vis.ids.includes(id)):[];
    const a=fn(s,id,m,{...o,...common,rememberOwnDelayedCheck:true,learnOwnDelayedFailureFaction:false});
    if(pre&&view&&expected){
      ok(!seen.has(k));seen.add(k);const beforeState=hash(s),beforeMemory=hash(serializeHostMemories(new Map([[id,m]]))),candidate=structuredClone(pre);
      const alternative=fn(s,id,candidate,{...o,...common,...FAILURE_FACTION_OPTIONS});
      strictEqual(hash(s),beforeState);strictEqual(hash(serializeHostMemories(new Map([[id,m]]))),beforeMemory);
      const controlKnowledge=updateBotKnowledge(view,[],structuredClone(m),{rememberOwnDelayedCheck:true});
      const candidateKnowledge=updateBotKnowledge(view,[],structuredClone(candidate),FAILURE_FACTION_OPTIONS);
      const removed:any[]=[],newKnown:any[]=[];
      // All hidden-truth reads below are external scoring after the candidate choice.
      for(const [target,names] of controlKnowledge.candidates){
        const remaining=candidateKnowledge.candidates.get(target)??[],lost=names.filter(n=>!remaining.includes(n));
        if(lost.length){const actual=s.players.find(p=>p.id===target)!.character;ok(!lost.includes(actual),'new false candidate elimination');removed.push({target,removed:lost,remaining,actual});}
      }
      for(const [target,name] of candidateKnowledge.known)if(controlKnowledge.known.get(target)!==name){
        strictEqual(s.players.find(p=>p.id===target)!.character,name,'new false exact identity');newKnown.push({target,name});
      }
      const receipts=expected.map(e=>{
        const rec=m.perception!.ownDelayedChecks!.records.find(r=>r.receiptSeq===e.receipt.seq)!;ok(rec);deepStrictEqual(rec.result,e.firstResultSeen.record.result);
        const old=controlKnowledge.candidates.get(rec.target)??[],next=candidateKnowledge.candidates.get(rec.target)??[];
        return {receipt:e.receipt,result:e.result,oldCandidates:old,newCandidates:next,
          eligible:old.some(c=>view.roster.find(r=>r.key===c)!.side===2)&&old.some(c=>view.roster.find(r=>r.key===c)!.side===1),
          removed:old.filter(c=>!next.includes(c))};
      });
      const clone=structuredClone(s),execution=alternative?applyAction(clone,id,alternative,s.now):null;
      rows.push({actor:id,at:view.elapsedMs,stage,view,events,preMemory:serializeHostMemories(new Map([[id,pre]])),
        oldAction:a,candidateAction:alternative,actionChanged:JSON.stringify(a)!==JSON.stringify(alternative),
        oldKnown:[...controlKnowledge.known],newKnown:[...candidateKnowledge.known],newExactIdentities:newKnown,removed,
        receipts,candidateCommand:execution?{accepted:execution.ok,error:execution.ok?null:execution.error,events:execution.events.filter(e=>e.vis.to==='all'||e.vis.to==='players'&&e.vis.ids.includes(id))}:null,
        actualMemoryRngAndEngineUnchanged:true});
    }
    return remember(s,id,a);
  };
  const current=wrap(smartBotAction,'primary'),chat=wrap(botCommunicationAction,'chat');
  const reference:Policy=(s,id,m,o)=>{const a=previous(s,id,m,{activity:o.activity});return remember(s,id,a?.type==='skill'&&a.skill==='publish'?{...a,name:opponentClaim(viewFor(s,id),m,original.style,a.name)}:a);};
  const game=playMatch(original.fixture,{current,reference},settings,(s,id,a,r)=>{
    const v=views.get(id)!;ok(v);views.delete(id);const after=viewFor(s,id);
    actions.push({player:id,at:v.elapsedMs,action:a,accepted:r.ok,error:r.ok?null:r.error??'unknown rejection',side:v.me.side,character:v.me.character,
      beforeMana:v.me.mana,afterMana:after.me.mana,maxMana:v.me.maxMana,nominalMana:a.type==='skill'?v.me.skills.find(x=>x.key===a.skill)?.mana??0:0,receiptKinds:r.events.map(e=>e.kind)});
  },{current:chat});
  if(observe)strictEqual(seen.size,wanted.size);
  deepStrictEqual(game,original.game);const keys=Object.keys(actions[0]??{});deepStrictEqual(actions,original.actions.map(a=>Object.fromEntries(keys.map(k=>[k,(a as any)[k]]))));
  return {fixture:original.fixture,style:original.style,variant:original.variant,game,actions:actions.length,actionsSHA256:hash(actions),
    expectedFailedResults:prior.episodes.filter((e:any)=>e.firstResultSeen?.record.status==='failed').length,rows};
}
export function verifiedFailureProbe061(original:Original,settings:Settings,prior:any){
  const on=failureProbe061(original,settings,prior),off=failureProbe061(original,settings,prior,false);
  deepStrictEqual({...on,rows:[]},off);return {...on,observerOnOffMatched:true};
}
