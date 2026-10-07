// 학습/개발/검증 게임은 시드로 분리. 정답은 평가 레코드에만 있고 정책에는 전달하지 않는다.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { assignmentBelief, beliefBrier, botKnowledge, smartBotAction, viewFor, createBotMemory,
  type PlayerView, type Knowledge } from '../src/index.js';
import { claimOpponent } from './claim-opponents.js';
import { fixtures, playMatch, summarize, pairedInterval, type Policy } from './league-runner.js';

const output=resolve(process.argv[2]??'../../docs/evaluations/claim-calibration');mkdirSync(output,{recursive:true});
const scales=[0,.25,.5,1,2,4] as const;
const modes=['civil_war','primordial','lidellut','troll'] as const;
const styles=['truthful','bluff','skill-aware-bluff'] as const;
const splits=[{name:'train',start:80000,count:6},{name:'development',start:81000,count:3},{name:'test',start:82000,count:6}] as const;
interface Observation { input:{view:PlayerView;candidates:[string,string[]][];automaticClaims:string[]}; labels:[string,string][];targets:string[] }
interface GameData { split:string;mode:string;style:string;seed:number;observations:Observation[];scores:number[];ended:boolean }
const data:GameData[]=[];
const hashes=Object.fromEntries(['src/bot.ts','src/bot-belief.ts','src/bot-claims.ts','src/bot-memory.ts','scripts/claim-calibration.ts','scripts/claim-opponents.ts','scripts/league-runner.ts'].map(p=>[p,createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex')]));
writeFileSync(resolve(output,'design.json'),JSON.stringify({format:1,baselineRemote:'f3bae28ef0b00e9823f3e007811a9c037feb6a4b',scales,splits,league:{start:83000,count:8},modes,styles,selection:'훈련 게임 평균 Brier 최소, 동률은 기존1과 가까운 값. 개발/검증 결과로 재선택하지 않음.',sampling:'한 게임 p1/p2의60/120/180/240초 관찰; 살아있는 미확정 대상만 채점; 게임별 평균 동등 가중.',scope:'합성 봇 혼합 분포의 단일 배율 학습. 인간/온라인 학습 아님. 주 판단만 보정하며 확장 탐색 비활성.',hashes},null,2));
for(const split of splits)for(const mode of modes)for(const style of styles)for(let i=0;i<split.count;i++) {
  const seed=split.start+i,observations:Observation[]=[],seen=new Set<string>();
  const opponent=claimOpponent(style);
  const observe:Policy=(state,id,memory,options)=>{
    const bucket=Math.floor(state.now/60000),key=`${id}:${bucket}`;
    if(['p1','p2'].includes(id)&&bucket>=1&&bucket<=4&&!seen.has(key)) {
      seen.add(key);
      const view=viewFor(state,id),copy=structuredClone(memory),knowledge=botKnowledge(state,id,view,copy);
      const targets=view.players.filter(p=>p.alive&&p.id!==id&&(knowledge.candidates.get(p.id)?.length??0)>1).map(p=>p.id);
      if(targets.length)observations.push({input:{view:structuredClone(view),candidates:[...knowledge.candidates],automaticClaims:[...(copy.perception?.automaticClaims??[])]},
        labels:state.players.map(p=>[p.id,p.character]),targets});
    }
    return opponent(state,id,memory,options);
  };
  const fixture=fixtures(mode,seed,8+i%5)[0]!;
  const result=playMatch(fixture,{current:observe,reference:observe});
  if(!observations.length)throw Error('관찰 없는 게임');
  const scores=scales.map(scale=>observations.reduce((sum,o)=>{
    const memory=createBotMemory(1);
    // 공개 관찰의 자동공표 태그만 복원한다. 전체 perception/정답은 모델 입력에서 제외한다.
    memory.perception={automaticClaims:new Set(o.input.automaticClaims)} as NonNullable<typeof memory.perception>;
    const knowledge:Knowledge={known:new Map(),candidates:new Map(o.input.candidates)};
    const b=assignmentBelief(o.input.view,knowledge,memory,scale);
    const score=beliefBrier(b,new Map(o.labels),o.targets);if(score===null)throw Error('채점 불가 배정');
    return sum+score;
  },0)/observations.length);
  data.push({split:split.name,mode,style,seed,observations,scores,ended:result.winner!==null});
  process.stderr.write(`[calibration] ${split.name}/${mode}/${style}/${i+1} 완료\n`);
}
// 오직 훈련 집합으로 선택한다. 아래 검증은 모델 선택에 되먹이지 않는다.
const aggregate=(rows:GameData[])=>scales.map((scale,j)=>({scale,brier:rows.reduce((s,r)=>s+r.scores[j]!,0)/rows.length}));
const train=aggregate(data.filter(r=>r.split==='train'));
const selected=[...train].sort((a,b)=>a.brier-b.brier||Math.abs(a.scale-1)-Math.abs(b.scale-1))[0]!.scale;
const model={version:1,kind:'claim-weight-power',scale:selected,trainedOn:splits[0],objective:'게임 평균 Brier',trainingScores:train};
writeFileSync(resolve(output,'model.json'),JSON.stringify(model,null,2));
const baselineIndex=scales.indexOf(1),selectedIndex=scales.indexOf(selected);
const evaluation=Object.fromEntries(splits.map(split=>{
 const rows=data.filter(r=>r.split===split.name);
 return [split.name,{games:rows.length,observations:rows.reduce((s,r)=>s+r.observations.length,0),unfinished:rows.filter(r=>!r.ended).length,
 scores:aggregate(rows),byCondition:modes.flatMap(mode=>styles.map(style=>{
 const subset=rows.filter(r=>r.mode===mode&&r.style===style);return{mode,style,games:subset.length,baseline:aggregate(subset)[baselineIndex]!.brier,learned:aggregate(subset)[selectedIndex]!.brier};
 }))}];
}));
const dataset=gzipSync(JSON.stringify(data));writeFileSync(resolve(output,'observations.json.gz'),dataset);
const summaries:(ReturnType<typeof summarize>&{mode:string;style:string})[]=[],rawMatches=[];
for(const mode of modes)for(const style of styles) {
 const games=[];
 for(let i=0;i<8;i++)for(const fixture of fixtures(mode,83000+i,8+i%5))games.push(playMatch(fixture,{
  current:(s,id,m,o)=>smartBotAction(s,id,m,{...o,claimEvidenceScale:selected}),reference:claimOpponent(style)
 }));
 const summary=summarize(games);summaries.push({mode,style,...summary});rawMatches.push(...games.map(g=>({...g,style})));
 process.stderr.write(`[calibration] league/${mode}/${style} 완료\n`);
}
// 같은 상대에 대한 baseline도 같은 새 시드에서 대결한다. 후보-상대 승률만으로 개선을 주장하지 않는다.
const referenceSummaries:(ReturnType<typeof summarize>&{mode:string;style:string})[]=[];
for(const mode of modes)for(const style of styles) {
 const games=[];
 for(let i=0;i<8;i++)for(const fixture of fixtures(mode,83000+i,8+i%5))games.push(playMatch(fixture,{current:smartBotAction,reference:claimOpponent(style)}));
 referenceSummaries.push({mode,style,...summarize(games)});rawMatches.push(...games.map(g=>({...g,style,baseline:true})));
 process.stderr.write(`[calibration] baseline/${mode}/${style} 완료\n`);
}
const differences=Array.from({length:8},(_,i)=>summaries.reduce((s,r,j)=>s+r.pairedScores[i]!.score-referenceSummaries[j]!.pairedScores[i]!.score,0)/summaries.length);
// 재표본 함수는[0,1]용이므로 차이를 가역 변환해 동일 시드 블록을 재표본한다.
const ci=pairedInterval(differences.map(d=>(d+1)/2)).map(v=>v*2-1);
const costRows=data.filter(r=>r.split==='test').filter((_,i)=>i%6===0).flatMap(r=>r.observations);
const costs:Record<string,number[]>={baseline:[],learned:[]};
for(let repeat=0;repeat<3;repeat++)for(const o of costRows)for(const [label,scale] of (repeat%2?[['learned',selected],['baseline',1]]:[['baseline',1],['learned',selected]]) as [string,number][]) {
 const m=createBotMemory(1);m.perception={automaticClaims:new Set(o.input.automaticClaims)} as NonNullable<typeof m.perception>;
 const start=performance.now();assignmentBelief(o.input.view,{known:new Map(),candidates:new Map(o.input.candidates)},m,scale);costs[label]!.push(performance.now()-start);
}
writeFileSync(resolve(output,'matches.json.gz'),gzipSync(JSON.stringify(rawMatches)));
writeFileSync(resolve(output,'result.json'),JSON.stringify({format:1,runtime:{node:process.version,arch:process.arch},model,evaluation,league:{candidate:summaries,baseline:referenceSummaries,pairedImprovement: differences.reduce((s,x)=>s+x,0)/differences.length,seedBootstrap95:ci,seedDifferences:differences},coldBeliefMs:Object.fromEntries(Object.entries(costs).map(([k,v])=>{v.sort((a,b)=>a-b);return[k,{samples:v.length,median:v[Math.floor(v.length/2)],p95:v[Math.floor(v.length*.95)],max:v.at(-1)}]})),datasetSha256:createHash('sha256').update(dataset).digest('hex'),hashes,scope:'작은 합성 시드 실험. 검증 데이터로 재튜닝하지 않음. 후보는 주판단 공표 추론만 변경하고 모든 수순탐색 옵션은 기본OFF. 비용은 차가운 배정계산만이며 전체판단/VM/인간상대 결과 아님.'},null,2));
console.log(JSON.stringify({scale:selected,train,evaluation:Object.fromEntries(Object.entries(evaluation).map(([k,v])=>[k,{games:v.games,scores:v.scores}])),leagueImprovement:differences.reduce((s,x)=>s+x,0)/8,ci},null,2));
