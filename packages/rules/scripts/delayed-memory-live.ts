/** 060 evaluator only: observes actual policy memory, never fills it on the policy's behalf. */
import {deepStrictEqual,strictEqual,ok} from 'node:assert';
import {smartBotAction,botCommunicationAction,eventsFor,viewFor,type BotMemory,type GameEvent,type PlayerView,type Action} from '../src/index.js';
import {nextRandom} from '../src/rng.js';
import {smartBotAction as previous} from './baselines/pre-cooperative.js';
import {opponentClaim} from './claim-opponents.js';
import {SENDER_OPTIONS} from './sender-development.js';
import {playMatch,type Policy,type Settings} from './league-runner.js';
import {hash,type Record055} from './troll-regression-replay.js';
import {withoutDelayed059} from './delayed-memory-evaluation.js';
import type {OwnDelayedCheck} from '../src/bot-own-delayed-check.js';
type Original=Pick<Record055,'fixture'|'style'|'variant'|'game'|'actions'>;
const personal=(e:GameEvent,id:string)=>e.vis.to==='players'&&e.vis.ids.length===1&&e.vis.ids[0]===id;
export function liveDelayed060(original:Original,settings:Settings,observe=true){
  ok(['control','candidate'].includes(original.variant));
  const options=original.variant==='candidate'?SENDER_OPTIONS:{},views=new Map<string,PlayerView>();
  const actions:any[]=[],episodes:any[]=[],observations:any[]=[],lastSeq=new Map<string,number>();
  let primaryCompared=0,chatCompared=0;
  const intake=(s:Parameters<Policy>[0],id:string,m:BotMemory,stage:string)=>{
    if(!observe)return;
    const view=viewFor(s,id),p=m.perception;
    if(view.phase!=='running'||!view.me.alive||view.me.character!=='kanulla'||p?.lastElapsedMs!==view.elapsedMs)return;
    const ledger=p.ownDelayedChecks;ok(ledger,'actual active policy omitted ledger');
    let inspected=0;
    for(const episode of episodes.filter(e=>e.actor===id&&e.receipt.seq<=p.lastSeq)){
      const rec:OwnDelayedCheck|undefined=ledger.records.find(r=>r.receiptSeq===episode.receipt.seq);ok(rec,'consumed own receipt absent from actual policy memory');
      strictEqual(rec.target,episode.receipt.data.target);strictEqual(rec.at,episode.receipt.at);strictEqual(rec.due,episode.receipt.at+60000);
      const result:GameEvent|undefined=eventsFor(s,id).find(e=>e.kind==='skill.chaos_hex.result'&&personal(e,id)&&e.data?.target===rec.target&&e.at===rec.due&&e.seq<=p.lastSeq);
      if(result){strictEqual(rec.result?.seq,result.seq);strictEqual(rec.result?.success,result.data?.success);strictEqual(rec.status,result.data?.success?'succeeded':'failed');}
      else {strictEqual(rec.result,undefined);strictEqual(rec.status,view.elapsedMs<rec.due?'pending':'overdue');}
      const sample={at:view.elapsedMs,stage,consumedThrough:p.lastSeq,record:structuredClone(rec),alive:true,phase:view.phase};
      episode.firstReceiptSeen??=sample;
      if(result)episode.firstResultSeen??=sample;
      inspected++;
    }
    if(inspected)observations.push({at:view.elapsedMs,actor:id,stage,inspected,consumedThrough:p.lastSeq,
      ledgerSHA256:hash(ledger),rng:m.rng});
  };
  const remember=(s:Parameters<Policy>[0],id:string,a:Action|null)=>{if(a)views.set(id,viewFor(s,id));return a;};
  const current:Policy=(s,id,m,o)=>{
    const compare=observe&&nextRandom({rng:m.rng})<=(o.activity??.5),shadow=compare?withoutDelayed059(m):null,before=compare?hash(s):null;
    const expected=shadow?smartBotAction(s,id,shadow,{...o,...options,rememberOwnDelayedCheck:false}):undefined;
    const a=smartBotAction(s,id,m,{...o,...options,rememberOwnDelayedCheck:true});
    if(shadow){deepStrictEqual(a,expected);deepStrictEqual(withoutDelayed059(m),shadow);strictEqual(hash(s),before);primaryCompared++;}
    intake(s,id,m,'primary');return remember(s,id,a);
  };
  const reference:Policy=(s,id,m,o)=>{const a=previous(s,id,m,{activity:o.activity});return remember(s,id,a?.type==='skill'&&a.skill==='publish'?{...a,name:opponentClaim(viewFor(s,id),m,original.style,a.name)}:a);};
  const chat:Policy=(s,id,m,o)=>{
    const compare=observe&&m.communicationAt===s.now-s.startedAt,shadow=compare?withoutDelayed059(m):null,before=compare?hash(s):null;
    const expected=shadow?botCommunicationAction(s,id,shadow,{...o,...options,rememberOwnDelayedCheck:false}):undefined;
    const a=botCommunicationAction(s,id,m,{...o,...options,rememberOwnDelayedCheck:true});
    if(shadow){deepStrictEqual(a,expected);deepStrictEqual(withoutDelayed059(m),shadow);strictEqual(hash(s),before);chatCompared++;}
    intake(s,id,m,'chat');return remember(s,id,a);
  };
  const collect=(s:Parameters<Policy>[0])=>{
    if(!observe)return;
    for(const [id,seq] of lastSeq){
      const view=viewFor(s,id);
      for(const e of eventsFor(s,id,seq).filter(e=>personal(e,id)&&e.kind==='skill.chaos_hex.result')){
        const matches=episodes.filter(x=>x.actor===id&&x.receipt.data.target===e.data?.target&&x.receipt.at+60000===e.at);
        strictEqual(matches.length,1);const ep=matches[0];strictEqual(ep.result,null);
        ep.result=structuredClone(e);ep.aliveAtResultCollection=view.me.alive;ep.phaseAtResultCollection=view.phase;
      }
      lastSeq.set(id,s.seq);
    }
  };
  const game=playMatch(original.fixture,{current,reference},settings,(s,id,a,result)=>{
    const view=views.get(id)!;ok(view);views.delete(id);const after=viewFor(s,id);
    actions.push({player:id,at:view.elapsedMs,action:a,accepted:result.ok,error:result.ok?null:result.error??'unknown rejection',
      side:view.me.side,character:view.me.character,beforeMana:view.me.mana,afterMana:after.me.mana,maxMana:view.me.maxMana,
      nominalMana:a.type==='skill'?view.me.skills.find(x=>x.key===a.skill)?.mana??0:0,receiptKinds:result.events.map(e=>e.kind)});
    if(observe&&view.me.side===original.fixture.currentSide&&a.type==='skill'&&a.skill==='chaos_hex'&&result.ok){
      const receipts=result.events.filter(e=>e.kind==='skill.chaos_hex.self'&&personal(e,id));strictEqual(receipts.length,1);
      episodes.push({actor:id,ordinal:actions.length-1,receipt:structuredClone(receipts[0]),firstReceiptSeen:null,result:null,
        aliveAtResultCollection:null,phaseAtResultCollection:null,firstResultSeen:null});
      if(!lastSeq.has(id))lastSeq.set(id,0);
    }
    collect(s);
  },{current:chat},collect);
  deepStrictEqual(game,original.game);const keys=Object.keys(actions[0]??{});
  deepStrictEqual(actions,original.actions.map(a=>Object.fromEntries(keys.map(k=>[k,(a as any)[k]]))));
  for(const e of episodes){
    e.receiptIntake=e.firstReceiptSeen?'observed':'no-live-memory-update-before-end';
    e.resultIntake=e.firstResultSeen?'observed':e.result?(e.aliveAtResultCollection?'no-later-live-memory-update':'postmortem-result'):'ended-before-result';
  }
  return {fixture:original.fixture,style:original.style,variant:original.variant,game,actions:actions.length,
    actionsSHA256:hash(actions),originalCommandsResourcesMatched:true,episodes,observations,primaryCompared,chatCompared};
}
export function verifiedLiveDelayed060(original:Original,settings:Settings){
  const on=liveDelayed060(original,settings,true),off=liveDelayed060(original,settings,false);
  deepStrictEqual({...on,episodes:[],observations:[],primaryCompared:0,chatCompared:0},off);
  return {...on,observerOnOffMatched:true};
}
