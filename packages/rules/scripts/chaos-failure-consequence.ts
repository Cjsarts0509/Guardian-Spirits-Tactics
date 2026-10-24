/** Evaluator-only synthetic branches. No policy or skill values change. */
import {deepStrictEqual,strictEqual,ok} from 'node:assert';
import {applyAction,advance,eventsFor,viewFor,type GameState} from '../src/index.js';
import {fixture058,digest058} from './own-delayed-memory.js';

/** The marker is external grading; it is never a bot input. */
export function failureConsequence(existingMarker:boolean,observe=true){
 const f=fixture058(existingMarker?'neonis':'satoshi'),s=f.snapshot.state;
 const points:any[]=[];const target=f.ids.satoshi!,prior=f.ids.neonis!,reader=f.ids.ulpian!;
 const mark=(x:GameState)=>x.modeState.chaosTarget??null;
 const capture=(stage:string)=>{
  if(!observe)return;
  const before=digest058(s),v=viewFor(s,f.actor),own=eventsFor(s,f.actor),other=eventsFor(s,reader);
  strictEqual(digest058(s),before,'observer changed engine');
  ok(!Object.hasOwn(v,'modeState'),'external marker leaked into own view');
  strictEqual(other.filter(e=>['skill.chaos_hex.self','skill.chaos_hex.result'].includes(e.kind)).length,0);
  points.push({stage,at:s.now,externalMarker:mark(s),externalGradingOnly:true,
   ownView:v,ownChaosEvents:own.filter(e=>e.kind.startsWith('skill.chaos_hex.')),
   unrelatedReaderPrivateChaosEvents:0,observerUnchanged:true});
 };
 capture('first-request');advance(s,61000);capture('first-result');
 strictEqual(mark(s),existingMarker?prior:null);
 const failureReceipts=[];
 for(const at of [71000,141000]){
  const before=mark(s),r=applyAction(s,f.actor,{type:'skill',skill:'chaos_hex',target},at);
  strictEqual(r.ok,true);strictEqual(mark(s),before,'request changed marker');
  failureReceipts.push({at,accepted:r.ok,events:r.events});capture('failure-request');
  advance(s,at+59999);strictEqual(mark(s),before);capture('before-failure-due');
  advance(s,at+60000);strictEqual(mark(s),before,'failed result changed marker');capture('failure-result');
  const e=eventsFor(s,f.actor).filter(e=>e.kind==='skill.chaos_hex.result').at(-1)!;
  strictEqual(e.at,at+60000);deepStrictEqual(e.data,{target,success:false});strictEqual(e.facts,undefined);
 }
 const purify=(id:string)=>{
  const clone=structuredClone(s),r=applyAction(clone,reader,{type:'skill',skill:'purify_hex',target:id},s.now+1);
  strictEqual(r.ok,true);
  return {target:id,accepted:r.ok,events:r.events,targetAlive:clone.players.find(p=>p.id===id)!.alive};
 };
 const failedTarget=purify(target),oldTarget=purify(prior);
 ok(failedTarget.events.some(e=>e.kind==='skill.purify_hex.fail'));strictEqual(failedTarget.targetAlive,true);
 strictEqual(oldTarget.events.some(e=>e.kind==='skill.purify_hex'),existingMarker);
 strictEqual(oldTarget.targetAlive,!existingMarker);
 return {kind:'chaos-failure-marker-consequence',synthetic:true,newResearchExecutions:0,existingMarker,
  actor:f.actor,failureTarget:target,priorSuccessfulTarget:existingMarker?prior:null,
  points,failureReceipts,failedTargetPurify:failedTarget,priorTargetPurify:oldTarget,
  finalMarker:mark(s),fullStateSHA256:digest058(s),engineLogSHA256:digest058(s.log)};
}

/** A successful result really replaces the marker, only at the scheduled due time. */
export function successConsequence(){
 const f=fixture058('neonis'),s=f.snapshot.state;advance(s,61000);
 const first=s.modeState.chaosTarget;strictEqual(first,f.ids.neonis);
 const r=applyAction(s,f.actor,{type:'skill',skill:'chaos_hex',target:f.ids.kazrow!},71000);
 strictEqual(r.ok,true);strictEqual(s.modeState.chaosTarget,first);
 advance(s,130999);strictEqual(s.modeState.chaosTarget,first);
 advance(s,131000);strictEqual(s.modeState.chaosTarget,f.ids.kazrow);
 return {synthetic:true,newResearchExecutions:0,first,second:s.modeState.chaosTarget,changedAt:131000,
  result:eventsFor(s,f.actor).filter(e=>e.kind==='skill.chaos_hex.result').at(-1)};
}
