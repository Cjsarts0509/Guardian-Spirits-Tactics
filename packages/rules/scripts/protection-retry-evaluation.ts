import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {smartBotAction} from '../src/bot.js';
import {fixtures,playMatch,summarize,pairedInterval} from './league-runner.js';
import {claimOpponent} from './claim-opponents.js';
const root=resolve(import.meta.dirname,'../../..'),out=resolve(root,'docs/evaluations/protection-retry');mkdirSync(out,{recursive:true});
const modes=['civil_war','primordial','lidellut','troll'] as const,styles=['truthful','bluff','skill-aware-bluff'] as const;
const design={candidate:{protectionRetryBackoff:true},development:{start:86000,count:8},holdout:{start:87000,count:16},gate:'개발 평균 점수 차이>=0 및 거절 감소, 미종료/초반공격실패 증가없음이면 고정후 holdout 실행. 결과별 모드 선택 없음.'};
writeFileSync(resolve(out,'design.json'),JSON.stringify(design,null,2));
const files=['src/bot.ts','src/bot-belief.ts','src/bot-memory.ts','src/bot-retry.ts','scripts/protection-retry-evaluation.ts','scripts/league-runner.ts','scripts/claim-opponents.ts'];
const hashes=Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(resolve(root,'packages/rules',p))).digest('hex')]));
async function evaluate(split:string,start:number,count:number){
 const candidate:(ReturnType<typeof summarize>&{mode:string;style:string})[]=[],baseline:(ReturnType<typeof summarize>&{mode:string;style:string})[]=[],raw=[];
 for(const mode of modes)for(const style of styles){
  const byPolicy=[];
  for(const learned of [false,true]){
   const games=[];
   for(let i=0;i<count;i++)for(const f of fixtures(mode,start+i,8+i%5))games.push(playMatch(f,{
    current:(s,id,m,o)=>smartBotAction(s,id,m,learned?{...o,...design.candidate}:o),reference:claimOpponent(style)
   }));
   byPolicy.push({mode,style,...summarize(games)});raw.push(...games.map(g=>({...g,style,learned})));
  }
  baseline.push(byPolicy[0]!);candidate.push(byPolicy[1]!);
  process.stderr.write(`[retry] ${split}/${mode}/${style} 완료\n`);
 }
 const differences=Array.from({length:count},(_,i)=>candidate.reduce((n,c,j)=>n+c.pairedScores[i]!.score-baseline[j]!.pairedScores[i]!.score,0)/candidate.length);
 const sum=(rows:typeof candidate,key:'unfinished'|'early')=>rows.reduce((n,r)=>n+(key==='unfinished'?r.wins.unfinished:r.stats.current.earlyAttackFailures),0);
 const delta=differences.reduce((n,x)=>n+x,0)/count;
 const result={split,start,count,candidate,baseline,delta,seedBootstrap95:pairedInterval(differences.map(d=>(d+1)/2)).map(v=>2*v-1),seedDifferences:differences,gatePassed:delta>=0&&candidate.reduce((n,r)=>n+r.stats.current.rejected,0)<baseline.reduce((n,r)=>n+r.stats.current.rejected,0)&&sum(candidate,'unfinished')<=sum(baseline,'unfinished')&&sum(candidate,'early')<=sum(baseline,'early'),hashes};
 writeFileSync(resolve(out,split+'-matches.json.gz'),gzipSync(JSON.stringify(raw)));
 writeFileSync(resolve(out,split+'.json'),JSON.stringify(result,null,2));return result;
}
const development=await evaluate('development',design.development.start,design.development.count);
if(development.gatePassed)await evaluate('holdout',design.holdout.start,design.holdout.count);
else writeFileSync(resolve(out,'holdout-not-run.json'),JSON.stringify({reason:'사전 개발 게이트 미통과. 87000–87015는 사용하지 않고 보존.',developmentDelta:development.delta},null,2));
