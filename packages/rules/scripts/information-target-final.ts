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
const root=resolve(import.meta.dirname,'../../..'),out=resolve(root,'docs/evaluations/information-target-final');mkdirSync(out,{recursive:true});
const modes=['civil_war','primordial','lidellut','troll'] as const,styles=['truthful','bluff','skill-aware-bluff'] as const;
const design={scope:'각 current 봇 자신의 첫 적격 정보수집 대상만 교체. 타 봇 기억/실제 진영 참조 없이 실행 가능. 이후 기본정책.',rule:'기존 정보 스킬/이름/행동기회 유지, 적확률↑·기대정보량≥원래50% 대안 규칙 고정.',development:{start:100000,count:32},holdout:{start:101000,count:32},gate:'봇별 적용 개발 점수차이>0, 미종료/초반실패 증가없으면 후보고정 최종검증. 미통과면 후보종료.',promotion:'최종95% 시드구간하한>0 및 미종료/초반실패 증가없음. 부족하면 미채택종료. 단일개입 재현과 별도로 판단.',replication:{start:99000,count:32},production:'평가 완료 전 기본옵션/운영배포 변경없음'};
const write=(name:string,data:unknown)=>writeFileSync(resolve(out,name+'.json'),JSON.stringify(data,null,2)+'\n');
const zipped=(name:string,data:unknown)=>writeFileSync(resolve(out,name+'.json.gz'),gzipSync(JSON.stringify(data)));
write('design',design);
const sources=['scripts/information-target-final.ts','scripts/information-target-model.ts','scripts/league-runner.ts','scripts/claim-opponents.ts','src/bot.ts','src/bot-memory.ts','src/bot-belief.ts'];
const hashes=Object.fromEntries(sources.map(p=>[p,createHash('sha256').update(readFileSync(resolve(root,'packages/rules',p))).digest('hex')]));
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
      seen.add(m);opportunities++;const arm='information' as const;
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
 else write('holdout-not-run',{reason:'봇별 적용 개발 게이트 미통과. 101000–101031 보존.',developmentDelta:dev.delta});
