import {describe,it,expect} from 'vitest';
import {createGame,applyAction,advance} from '@gst/rules';
import {buildRecord,saveRecord} from '../src/records.js';
import {auditMatchRecord} from '../src/record-audit.js';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
function fixture(){
 const {state}=createGame({mode:'civil_war',players:Array.from({length:8},(_,i)=>({id:'p'+i,nickname:'private-name-'+i})),seed:23,now:1000000});
 const initialState=structuredClone(state),actions=[];
 for(const [i,controller] of ['human-input','bot','away-bot'].entries()){
  const p=state.players[i]!,action={type:'skill' as const,skill:'publish',name:p.character},r=applyAction(state,p.id,action,state.startedAt+i*1000);
  actions.push({t:i*1000,player:p.id,action,ok:r.ok,error:r.error,controller:controller as 'human-input'|'bot'|'away-bot'});
 }
 advance(state,state.startedAt+10000);
 return buildRecord({roomId:'audit',roomName:'test',turnSeconds:90,botKind:'smart',aiOnly:false,bots:new Set(['p1']),initialBots:new Set(['p1']),initialState,state,actions});
}
describe('factual human-match evidence audit',()=>{
 it('replays actual receipts and final state but does not equate client inputs with real humans or improved win rates',()=>{
  const d=auditMatchRecord(fixture());expect(d.replayVerified).toBe(true);expect(d.humanInputs).toBe(1);expect(d.botActions).toBe(1);expect(d.awayBotActions).toBe(1);expect(d.humanOpponentWinRateEvidence).toBe(false);
  expect(JSON.stringify(d)).not.toContain('private-name');
 });
 it('excludes legacy records without initial-state provenance',()=>{const r=fixture();delete r.replay;expect(auditMatchRecord(r)).toMatchObject({replayVerified:false,reason:'initial_state_or_controller_provenance_missing'});});
 it('rejects tampered receipts, timelines, final state and outcome metadata',()=>{
  for(const mutate of [(r:any)=>r.actions[0].ok=!r.actions[0].ok,(r:any)=>r.actions[1].t=-1,(r:any)=>r.finalState.players[0].mana++,(r:any)=>r.winner=2]){
   const r=fixture();mutate(r);expect(auditMatchRecord(r).replayVerified).toBe(false);
  }
 });
 it('distinguishes unknown old controllers and away bots from human inputs',()=>{
  const r=fixture();delete r.actions[0]!.controller;const d=auditMatchRecord(r);expect(d.replayVerified).toBe(true);expect(d.unknownControllers).toBe(1);expect(d.humanInputs).toBe(0);expect(d.humanOpponentWinRateEvidence).toBe(false);
 });
 it('builds independent immutable snapshots',()=>{
  const r=fixture(),initial=JSON.stringify(r.replay!.initialState);r.finalState.players[0]!.mana++;expect(JSON.stringify(r.replay!.initialState)).toBe(initial);
 });
 it('does not echo private strings from malformed record metadata or engine errors',()=>{
  const secret='private-human-name-secret';
  for(const mutate of [(r:any)=>r.winner=secret,(r:any)=>r.replay.authority=secret,(r:any)=>r.actions={length:secret},(r:any)=>r.actions[0].action.skill=secret]){
   const r=fixture();mutate(r);expect(JSON.stringify(auditMatchRecord(r))).not.toContain(secret);
  }
 });
 it('publishes idempotently and rejects conflicting concurrent records without truncating the original',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'gst-atomic-rec-'));try{
   const r=fixture(),[a,b]=await Promise.all([saveRecord(dir,r),saveRecord(dir,r)]);expect(a).toBe(b);const raw=await readFile(a,'utf8');
   const changed=structuredClone(r);changed.winner=2;await expect(saveRecord(dir,changed)).rejects.toThrow();expect(await readFile(a,'utf8')).toBe(raw);
  }finally{await rm(dir,{recursive:true,force:true});}
 });
});
