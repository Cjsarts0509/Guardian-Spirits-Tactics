// Offline factual replay only. Historical opponents do not react to counterfactual bot decisions.
import {advance,applyAction} from '@gst/rules';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import type {MatchRecord} from './records.js';
const canonical=(x:unknown)=>JSON.parse(JSON.stringify(x));
export function auditMatchRecord(record:MatchRecord){
 const digest=createHash('sha256').update(JSON.stringify(record)).digest('hex');
 const out={recordSHA256:digest,replayVerified:false,actions:Array.isArray(record.actions)?record.actions.length:0,humanInputs:0,botActions:0,awayBotActions:0,unknownControllers:0,
  humanOpponentWinRateEvidence:false,reason:'',winner:typeof record.winner==='number'&&Number.isSafeInteger(record.winner)?record.winner:null,authority:record.replay?.authority==='server'||record.replay?.authority==='player-host'?record.replay.authority:'legacy-unknown'};
 if(record.version!=='gst-record-1'||!Array.isArray(record.actions)||!record.replay||record.replay.version!==1){out.reason='initial_state_or_controller_provenance_missing';return out;}
 try{
  const state=structuredClone(record.replay.initialState),initial=record.replay.initialState;
  if(initial.mode!==record.mode||initial.seed!==record.seed||initial.startedAt!==Date.parse(record.startedAt)||initial.now!==initial.startedAt||initial.phase!=='running'||
   new Set(initial.players.map(p=>p.id)).size!==initial.players.length||!isDeepStrictEqual(canonical(record.log),canonical(record.finalState.log)))throw Error('initial_or_final_metadata_mismatch');
  let last=-1;
  for(const a of record.actions){
   if(!Number.isFinite(a.t)||a.t<last||a.t<0||a.t>record.durationMs||!state.players.some(p=>p.id===a.player))throw Error('invalid_action_order_or_player');last=a.t;
   if(a.controller==='human-input')out.humanInputs++;else if(a.controller==='bot')out.botActions++;else if(a.controller==='away-bot')out.awayBotActions++;else out.unknownControllers++;
   const result=applyAction(state,a.player,a.action,initial.startedAt+a.t);
   if(result.ok!==a.ok||(result.error??null)!==(a.error??null))throw Error('action_receipt_mismatch');
  }
  if(record.durationMs!==record.finalState.now-initial.startedAt||Date.parse(record.endedAt)!==record.finalState.now||record.finalState.winner!==record.winner||record.finalState.endReason!==record.endReason)throw Error('duration_or_outcome_mismatch');
  advance(state,record.finalState.now);
  if(!isDeepStrictEqual(canonical(state),canonical(record.finalState)))throw Error('final_state_mismatch_possible_unrecorded_lifecycle_or_engine_version');
  out.replayVerified=true;out.reason=out.unknownControllers?'controller_provenance_missing':out.humanInputs?'factual_inputs_verified_human_participation_unattested':'no_human_inputs';
 }catch(e){const safe=new Set(['initial_or_final_metadata_mismatch','invalid_action_order_or_player','action_receipt_mismatch','duration_or_outcome_mismatch','final_state_mismatch_possible_unrecorded_lifecycle_or_engine_version']);out.reason=e instanceof Error&&safe.has(e.message)?e.message:'engine_replay_failed';}
 return out;
}
