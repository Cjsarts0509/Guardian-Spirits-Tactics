import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {smartBotAction,botKnowledge} from '../src/bot.js';
import {viewFor} from '../src/engine/view.js';
import type {BotMemory} from '../src/bot-memory.js';
import {nextRandom} from '../src/rng.js';
import {fixtures,playMatch,summarize,pairedInterval,type MatchResult,type Policy} from './league-runner.js';
import {claimOpponent} from './claim-opponents.js';
import {context,fit,select,type Row} from './information-target-model.js';
const root=resolve(import.meta.dirname,'../../..'),out=resolve(root,'docs/evaluations/information-target');mkdirSync(out,{recursive:true});
const modes=['civil_war','primordial','lidellut','troll'] as const,styles=['truthful','bluff','skill-aware-bluff'] as const;
const design={scope:'각 current 봇의 첫 적격 정보수집에서 같은 스킬/이름/시점, 대상만 교체. 이후 기본정책.',features:['보석/확인/스캔','6분 전/이후'],alternative:'자기 배정확률상 적일 확률이 더 높고 기대정보량이 원래의50% 이상인 다른 대상. 기존 스킬과 이름 유지.',training:{start:95000,count:48},development:{start:96000,count:8},holdout:{start:97000,count:16},fit:{prior:[2,2],minPerArm:32,margin:0.03},exploration:'기존/대체 대상50% 균등, 최종승패보상/미종료0.5',gate:'개발 평균점수차이>0 및 미종료/초반실패 증가없음. 비기본 후보없으면 평가생략.',promotion:'최종 시드bootstrap95% 하한>0 및 안전게이트, 자동운영반영 없음.'};
const write=(name:string,data:unknown)=>writeFileSync(resolve(out,name+'.json'),JSON.stringify(data,null,2)+'\n');
const zipped=(name:string,data:unknown)=>writeFileSync(resolve(out,name+'.json.gz'),gzipSync(JSON.stringify(data)));
write('design',design);
const sources=['scripts/information-target-experiment.ts','scripts/information-target-model.ts','scripts/league-runner.ts','scripts/claim-opponents.ts','src/bot.ts','src/bot-memory.ts','src/bot-belief.ts'];
const hashes=Object.fromEntries(sources.map(p=>[p,createHash('sha256').update(readFileSync(resolve(root,'packages/rules',p))).digest('hex')]));
const rows:(Row&{seed:number;mode:string;style:string;reversed:boolean;currentSide:number;player:string;elapsedMs:number;original:import('../src/types.js').Action;originalInfo:number;originalEnemy:number;alternativeInfo:number;alternativeEnemy:number;alternative:import('../src/types.js').Action|null})[]=[],trainingGames=[];
for(const mode of modes)for(const style of styles){
 for(let i=0;i<design.training.count;i++)for(const f of fixtures(mode,design.training.start+i,8+i%5)){
  const seen=new WeakSet<BotMemory>(),pending:Omit<typeof rows[number],'reward'>[]=[];
  // 별도 탐색 RNG. 정책/엔진 RNG를 소비하지 않으며 한 판의 첫 제안 순서대로 독립 배정한다.
  const exploration={rng:(f.seed*104729+(f.reversed?997:0)+f.currentSide*8191)|0};
  const game=playMatch(f,{current:(s,id,m,o)=>{
   const action=smartBotAction(s,id,m,o);if(seen.has(m)||action?.type!=='skill')return action;
   const view=viewFor(s,id),ctx=context(view,botKnowledge(s,id,view,m),action);if(!ctx)return action;
   seen.add(m);const arms:Row['arm'][]=['act','information'];
   const arm=arms[Math.floor(nextRandom(exploration)*arms.length)]!;
   pending.push({cell:ctx.cell,arm,seed:f.seed,mode,style,reversed:f.reversed,currentSide:f.currentSide,player:id,elapsedMs:view.elapsedMs,original:action,originalInfo:ctx.originalInfo,originalEnemy:ctx.originalEnemy,alternativeInfo:ctx.alternativeInfo,alternativeEnemy:ctx.alternativeEnemy,alternative:ctx.alternative});
   return select(action,ctx,arm);
  },reference:claimOpponent(style)});
  const reward=game.winnerPolicy==='current'?1:game.winnerPolicy==='reference'?0:0.5;
  rows.push(...pending.map(r=>({...r,reward})));trainingGames.push({...game,style});
 }
 process.stderr.write(`[information-target] train/${mode}/${style}\n`);
}
zipped('training-observations',rows);zipped('training-matches',trainingGames);
const model=fit(rows);write('model',model);
write('training-summary',{games:trainingGames.length,observations:rows.length,unfinished:trainingGames.filter(g=>!g.winner).length,hashes});
if(!Object.values(model).some(c=>c.choice!=='act')){
 write('evaluation-not-run',{reason:'학습된 비기본 셀 없음. 후보가 기준 정책과 같아 개발/최종 시드 보존.'});
}else{
 async function evaluate(split:string,start:number,count:number){
  const candidate:(ReturnType<typeof summarize>&{mode:string;style:string})[]=[],baseline:typeof candidate=[],raw=[];
  let opportunities=0,information=0;
  for(const mode of modes)for(const style of styles){
   for(const learned of [false,true]){
    const games:MatchResult[]=[];
    for(let i=0;i<count;i++)for(const f of fixtures(mode,start+i,8+i%5)){
     const seen=new WeakSet<BotMemory>();
     const current:Policy=(s,id,m,o)=>{
      const action=smartBotAction(s,id,m,o);if(!learned||seen.has(m)||action?.type!=='skill')return action;
      const view=viewFor(s,id),ctx=context(view,botKnowledge(s,id,view,m),action);if(!ctx)return action;
      seen.add(m);opportunities++;const arm=model[ctx.cell]!.choice;
      if(arm==='information')information++;return select(action,ctx,arm);
     };
     games.push(playMatch(f,{current,reference:claimOpponent(style)}));
    }
    (learned?candidate:baseline).push({mode,style,...summarize(games)});raw.push(...games.map(g=>({...g,style,learned})));
   }
   process.stderr.write(`[information-target] ${split}/${mode}/${style}\n`);
  }
  const differences=Array.from({length:count},(_,i)=>candidate.reduce((n,c,j)=>n+c.pairedScores[i]!.score-baseline[j]!.pairedScores[i]!.score,0)/candidate.length);
  const delta=differences.reduce((n,x)=>n+x,0)/count;
  const sum=(a:typeof candidate,key:'unfinished'|'early')=>a.reduce((n,r)=>n+(key==='unfinished'?r.wins.unfinished:r.stats.current.earlyAttackFailures),0);
  const interval=pairedInterval(differences.map(d=>(d+1)/2)).map(v=>2*v-1);
  const safe=sum(candidate,'unfinished')<=sum(baseline,'unfinished')&&sum(candidate,'early')<=sum(baseline,'early');
  const result={split,start,count,candidate,baseline,delta,seedBootstrap95:interval,seedDifferences:differences,opportunities,information,gatePassed:delta>0&&safe,promotionEvidence:interval[0]!>0&&safe,hashes};
  write(split,result);zipped(split+'-matches',raw);return result;
 }
 const dev=await evaluate('development',design.development.start,design.development.count);
 if(dev.gatePassed)await evaluate('holdout',design.holdout.start,design.holdout.count);
 else write('holdout-not-run',{reason:'사전 개발 게이트 미통과. 97000–97015 보존.',developmentDelta:dev.delta});
}
