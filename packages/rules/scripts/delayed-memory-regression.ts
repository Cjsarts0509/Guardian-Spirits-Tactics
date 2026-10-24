/** Four-mode synthetic regression only, excluded from competitive research counts. */
import {createHash} from 'node:crypto';
import {smartBotAction,botCommunicationAction,serializeHostMemories,type ModeId} from '../src/index.js';
import {playMatch,DEFAULT_SETTINGS,type Policy} from './league-runner.js';
export function regression059(remember?:boolean){
  return (['civil_war','primordial','lidellut','troll'] as ModeId[]).map(mode=>{
    const digest=createHash('sha256');let decisions=0,chats=0,actions=0,ledgerSamples=0;
    const wrap=(fn:Policy,chat=false):Policy=>(s,id,m,o)=>{
      const opts=remember===undefined?o:{...o,rememberOwnDelayedCheck:remember};
      const a=fn(s,id,m,opts),copy=structuredClone(m);
      const extra=(copy.perception as any)?.ownDelayedChecks;
      if(extra?.records.length)ledgerSamples++;
      if(copy.perception)delete (copy.perception as any).ownDelayedChecks;
      digest.update(JSON.stringify({id,at:s.now,chat,action:a,memory:serializeHostMemories(new Map([[id,copy]])),state:s})+'\n');
      if(chat)chats++;else decisions++;return a;
    };
    const policy=wrap(smartBotAction),chat=wrap(botCommunicationAction,true);
    const game=playMatch({mode,seed:41,count:12,reversed:false,currentSide:1},{current:policy,reference:policy},
      {...DEFAULT_SETTINGS,limitMs:240000},()=>{actions++;},{current:chat,reference:chat});
    return {core:{mode,game,decisions,chats,actions,traceSHA256:digest.digest('hex')},ledgerSamples};
  });
}
