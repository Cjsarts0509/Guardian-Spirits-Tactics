import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {smartBotAction,botCommunicationAction,viewFor} from '../src/index.js';
import {nextRandom} from '../src/rng.js';
import {smartBotAction as previous} from './baselines/pre-cooperative.js';
import {opponentClaim} from './claim-opponents.js';
import {playMatch} from './league-runner.js';
const raw=gunzipSync(readFileSync(process.argv[2]!)),d=JSON.parse(raw.toString()),rows=[];
for(const variant of ['control','reportedSupreme']){
 const old=d.records.find((r:any)=>r.mode==='primordial'&&r.style==='bluff'&&r.variant===variant&&r.result.game.fixture.seed===150007&&!r.result.game.fixture.reversed&&r.result.game.fixture.currentSide===2).result;
 const pending=new Map(),actions:any[]=[],sameActionDifferentRng:any[]=[];
 const options=variant==='reportedSupreme'?{reportedSupreme:true}:{};
 const remember=(s:any,id:string,a:any)=>{if(a)pending.set(id,viewFor(s,id));return a;};
 const current=(s:any,id:string,m:any,o:any)=>{
  const before=nextRandom({rng:m.rng})<=(o.activity??.5)?structuredClone(m):null;
  const action=smartBotAction(s,id,m,{...o,...options});
  if(before&&m.communicationAt===s.now-s.startedAt){
   const off=smartBotAction(s,id,before,{...o,reportedSupreme:false});
   if(isDeepStrictEqual(action,off)&&m.rng!==before.rng)sameActionDifferentRng.push({player:id,at:s.now-s.startedAt,action,onRng:m.rng,offRng:before.rng,knownSame:isDeepStrictEqual(m.perception?.known,before.perception?.known),memoryExceptRngSame:isDeepStrictEqual({...m,rng:0},{...before,rng:0})});
  }
  return remember(s,id,action);
 };
 const reference=(s:any,id:string,m:any,o:any)=>{const a=previous(s,id,m,{activity:o.activity});return a?.type==='skill'&&a.skill==='publish'?{...a,name:opponentClaim(viewFor(s,id),m,'bluff',a.name)}:a;};
 const chat=(s:any,id:string,m:any,o:any)=>remember(s,id,botCommunicationAction(s,id,m,{...o,...options}));
 const game=playMatch(old.game.fixture,{current,reference},d.settings,(s,id,a,r)=>{
  const v=pending.get(id);if(!v)return;pending.delete(id);const after=viewFor(s,id);
  actions.push({player:id,at:v.elapsedMs,action:a,accepted:r.ok,error:r.ok?null:r.error??'알 수 없는 거절',beforeMana:v.me.mana,afterMana:after.me.mana,nominalMana:a.type==='skill'?v.me.skills.find((x:any)=>x.key===a.skill)?.mana??0:0,character:v.me.character,side:v.me.side});
 },{current:chat});
 const keys=['player','at','action','accepted','error','beforeMana','afterMana','nominalMana','character','side'];
 if(!isDeepStrictEqual(game,old.game)||!isDeepStrictEqual(actions,old.actions.map((a:any)=>Object.fromEntries(keys.map(k=>[k,a[k]])))))throw Error('replay changed original match/actions');
 rows.push({variant,gameMatched:true,actionsMatched:true,sameActionDifferentRng});
}
writeFileSync(process.argv[3]!,JSON.stringify({kind:'round044-posthoc-same-action-rng-diagnostic',sourceSHA256:createHash('sha256').update(raw).digest('hex'),scriptSHA256:createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),researchExecutions:0,replayedGames:2,rows},null,2));
