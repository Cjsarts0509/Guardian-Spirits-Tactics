/** Evaluation-only replay. No external observation is returned to policy or memory. */
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {smartBotAction,botCommunicationAction,viewFor,type GameState,type GameEvent,type PlayerView,type Action} from '../src/index.js';
import {playMatch,prepareMatch,DEFAULT_SETTINGS,type Fixture,type Policy,type Settings} from './league-runner.js';
import type {GuardVariant} from './guard-selfplay.js';
export function playGuardRealization(fixture:Fixture,variant:GuardVariant,settings:Settings=DEFAULT_SETTINGS,observe=true){
 if(fixture.mode!=='primordial'||!['cooperative','knownCommanderGuardBeforeAlly'].includes(variant))throw Error('invalid guard realization replay');
 const options=variant==='cooperative'?{}:{knownCommanderGuardBeforeAlly:true};
 const initial=prepareMatch(fixture).state;
 const pairs=initial.players.flatMap(p=>{
  const spec=p.character==='consume'?['eltas','consume_master_guard']:p.character==='kumarin'?['rael','kumarin_commander_guard']:null;
  const target=spec?initial.players.find(t=>t.character===spec[0]):null;
  return spec&&target?[{id:p.id,role:p.character,target:target.id,skill:spec[1]!}]:[];
 });
 const snapshot=(s:GameState)=>pairs.map(x=>{
  const p=s.players.find(p=>p.id===x.id)!,target=s.players.find(p=>p.id===x.target)!;
  return {...x,character:p.character,alive:p.alive,hasSkill:p.skills.some(k=>k.key===(x.role==='consume'?'consume_bodyguard':'kumarin_bodyguard')),charges:Number(p.flags.guardCharges??0),targetCharacter:target.character,targetAlive:target.alive};
 });
 type Snapshot=ReturnType<typeof snapshot>;
 const transitions:Array<{at:number;cause:'advance'|'action';actor:string|null;action:Action|null;before:Snapshot;after:Snapshot;events:GameEvent[]}>=[];
 let prior=snapshot(initial),lastSeq=initial.seq;
 const note=(s:GameState,cause:'advance'|'action',actor:string|null=null,action:Action|null=null,events:GameEvent[]=[])=>{
  if(!observe)return;
  const after=snapshot(s);
  if(!isDeepStrictEqual(prior,after)||events.some(e=>e.kind==='attack.guarded'||e.kind==='skill.consume_master_guard'||e.kind==='skill.kumarin_commander_guard'))
   transitions.push({at:s.now-s.startedAt,cause,actor,action:structuredClone(action),before:prior,after,events:structuredClone(events)});
  prior=after;lastSeq=s.seq;
 };
 const pending=new Map<string,PlayerView>();
 const remember=(s:GameState,id:string,a:Action|null)=>{if(observe&&a)pending.set(id,viewFor(s,id));return a;};
 const policy:Policy=(s,id,m,o)=>remember(s,id,smartBotAction(s,id,m,{...o,...options}));
 const chat:Policy=(s,id,m,o)=>remember(s,id,botCommunicationAction(s,id,m,{...o,...options}));
 const actions:Array<{player:string;at:number;action:Action;accepted:boolean;error:string|null;beforeMana:number;afterMana:number;nominalMana:number;character:string;side:number;receiptKinds:string[]}>=[];
 const game=playMatch(fixture,{current:policy,reference:policy},settings,(s,id,a,r)=>{
  if(!observe)return;const before=pending.get(id);if(!before)throw Error('missing own pre-action view');pending.delete(id);
  const after=viewFor(s,id);
  actions.push({player:id,at:before.elapsedMs,action:structuredClone(a),accepted:r.ok,error:r.ok?null:r.error??'알 수 없는 거절',beforeMana:before.me.mana,afterMana:after.me.mana,
   nominalMana:a.type==='skill'?before.me.skills.find(x=>x.key===a.skill)?.mana??0:0,character:before.me.character,side:before.me.side,receiptKinds:r.events.map(e=>e.kind)});
  note(s,'action',id,a,r.events);
 },{current:chat,reference:chat},s=>note(s,'advance',null,null,s.log.filter(e=>e.seq>lastSeq)));
 return {game,actions,transitions,finalGuardians:observe?prior:[]};
}
export const actionDigest=(actions:ReturnType<typeof playGuardRealization>['actions'])=>createHash('sha256').update(JSON.stringify(actions)).digest('hex');
