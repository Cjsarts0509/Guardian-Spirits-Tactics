import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {smartBotAction} from '../src/bot.js';
import {viewFor} from '../src/engine/view.js';
import type {BotMemory} from '../src/bot-memory.js';
import {nextRandom} from '../src/rng.js';
import {fixtures,playMatch,summarize,pairedInterval,type MatchResult,type Policy} from './league-runner.js';
import {claimOpponent} from './claim-opponents.js';
import {allyCell,fitAllyValue,chooseAllyWait,type Observation} from './ally-value-model.js';
const root=resolve(import.meta.dirname,'../../..'),out=resolve(root,'docs/evaluations/ally-value');mkdirSync(out,{recursive:true});
const modes=['civil_war','primordial','lidellut','troll'] as const,styles=['truthful','bluff','skill-aware-bluff'] as const;
const design={scope:'각 current 봇의 첫 ally 제안만 즉시 실행 또는 이번 기회 대기. 대기 후 기본 정책 복귀.',features:{manaBoundary:60,elapsedBoundaryMs:360000},training:{start:88000,count:32,waitProbability:0.5},development:{start:89000,count:8},holdout:{start:90000,count:16},fit:{prior:[2,2],minPerArm:32,margin:0.03},gate:'개발 평균 점수차이>0, 미종료/초반공격실패 증가없음일 때 고정 후보로 holdout. 학습된 대기 셀이 없으면 후속 대전 생략.',promotion:'최종 점수차이 95% 시드 부트스트랩 하한>0 및 안전 게이트 필요. 자동 운영 반영 없음.'};
const write=(name:string,data:unknown)=>writeFileSync(resolve(out,name+'.json'),JSON.stringify(data,null,2)+'\n');
const zipped=(name:string,data:unknown)=>writeFileSync(resolve(out,name+'.json.gz'),gzipSync(JSON.stringify(data)));
write('design',design);
const sources=['scripts/ally-value-experiment.ts','scripts/ally-value-model.ts','scripts/league-runner.ts','scripts/claim-opponents.ts','src/bot.ts','src/bot-memory.ts','src/bot-belief.ts'];
const hashes=Object.fromEntries(sources.map(p=>[p,createHash('sha256').update(readFileSync(resolve(root,'packages/rules',p))).digest('hex')]));
const rows:(Observation&{seed:number;mode:string;style:string;reversed:boolean;currentSide:number;player:string;elapsedMs:number;mana:number})[]=[],trainingGames=[];
for(const mode of modes)for(const style of styles){
 for(let i=0;i<design.training.count;i++)for(const f of fixtures(mode,design.training.start+i,8+i%5)){
  const seen=new WeakSet<BotMemory>(),pending:Omit<typeof rows[number],'reward'>[]=[];
  // 별도 탐색 RNG. 정책/엔진 RNG를 소비하지 않으며 한 판의 첫 제안 순서대로 독립 배정한다.
  const exploration={rng:(f.seed*104729+(f.reversed?997:0)+f.currentSide*8191)|0};
  const game=playMatch(f,{current:(s,id,m,o)=>{
   const action=smartBotAction(s,id,m,o);if(seen.has(m)||action?.type!=='skill'||action.skill!=='ally')return action;
   const view=viewFor(s,id),cell=allyCell(view,action);if(!cell)return action;
   seen.add(m);const wait=nextRandom(exploration)<0.5;
   pending.push({cell,wait,seed:f.seed,mode,style,reversed:f.reversed,currentSide:f.currentSide,player:id,elapsedMs:view.elapsedMs,mana:view.me.mana});
   return wait?null:action;
  },reference:claimOpponent(style)});
  const reward=game.winnerPolicy==='current'?1:game.winnerPolicy==='reference'?0:0.5;
  rows.push(...pending.map(r=>({...r,reward})));trainingGames.push({...game,style});
 }
 process.stderr.write(`[ally-value] train/${mode}/${style}\n`);
}
zipped('training-observations',rows);zipped('training-matches',trainingGames);
const model=fitAllyValue(rows,design.fit.minPerArm,design.fit.margin);write('model',model);
write('training-summary',{games:trainingGames.length,observations:rows.length,unfinished:trainingGames.filter(g=>!g.winner).length,hashes});
if(!Object.values(model.cells).some(c=>c.chooseWait)){
 write('evaluation-not-run',{reason:'학습된 대기 셀 없음. 후보가 기준 정책과 같아 개발/최종 시드 보존.'});
}else{
 async function evaluate(split:string,start:number,count:number){
  const candidate:(ReturnType<typeof summarize>&{mode:string;style:string})[]=[],baseline:typeof candidate=[],raw=[];
  let opportunities=0,waits=0;
  for(const mode of modes)for(const style of styles){
   for(const learned of [false,true]){
    const games:MatchResult[]=[];
    for(let i=0;i<count;i++)for(const f of fixtures(mode,start+i,8+i%5)){
     const seen=new WeakSet<BotMemory>();
     const current:Policy=(s,id,m,o)=>{
      const action=smartBotAction(s,id,m,o);if(!learned||seen.has(m)||action?.type!=='skill'||action.skill!=='ally')return action;
      const cell=allyCell(viewFor(s,id),action);if(!cell)return action;
      seen.add(m);opportunities++;
      if(chooseAllyWait(model,cell)){waits++;return null;}return action;
     };
     games.push(playMatch(f,{current,reference:claimOpponent(style)}));
    }
    (learned?candidate:baseline).push({mode,style,...summarize(games)});raw.push(...games.map(g=>({...g,style,learned})));
   }
   process.stderr.write(`[ally-value] ${split}/${mode}/${style}\n`);
  }
  const differences=Array.from({length:count},(_,i)=>candidate.reduce((n,c,j)=>n+c.pairedScores[i]!.score-baseline[j]!.pairedScores[i]!.score,0)/candidate.length);
  const delta=differences.reduce((n,x)=>n+x,0)/count;
  const sum=(a:typeof candidate,key:'unfinished'|'early')=>a.reduce((n,r)=>n+(key==='unfinished'?r.wins.unfinished:r.stats.current.earlyAttackFailures),0);
  const interval=pairedInterval(differences.map(d=>(d+1)/2)).map(v=>2*v-1);
  const safe=sum(candidate,'unfinished')<=sum(baseline,'unfinished')&&sum(candidate,'early')<=sum(baseline,'early');
  const result={split,start,count,candidate,baseline,delta,seedBootstrap95:interval,seedDifferences:differences,opportunities,waits,gatePassed:delta>0&&safe,promotionEvidence:interval[0]!>0&&safe,hashes};
  write(split,result);zipped(split+'-matches',raw);return result;
 }
 const dev=await evaluate('development',design.development.start,design.development.count);
 if(dev.gatePassed)await evaluate('holdout',design.holdout.start,design.holdout.count);
 else write('holdout-not-run',{reason:'사전 개발 게이트 미통과. 90000–90015 보존.',developmentDelta:dev.delta});
}
