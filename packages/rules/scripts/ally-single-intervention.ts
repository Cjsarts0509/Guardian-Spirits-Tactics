import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {smartBotAction,botKnowledge} from '../src/bot.js';
import {viewFor} from '../src/engine/view.js';
import type {BotMemory} from '../src/bot-memory.js';
import type {Action,GameState} from '../src/types.js';
import {fixtures,playMatch,pairedInterval,type Fixture,type MatchResult} from './league-runner.js';
import {claimOpponent,type ClaimStyle} from './claim-opponents.js';
import {context,type Model} from './ally-context-model.js';
const root=resolve(import.meta.dirname,'../../..'),out=resolve(root,'docs/evaluations/ally-single-intervention');mkdirSync(out,{recursive:true});
const modelFile=resolve(root,'docs/evaluations/ally-context/model.json');
const model=JSON.parse(readFileSync(modelFile,'utf8')) as Model;
const hash=(data:string|Buffer)=>createHash('sha256').update(data).digest('hex');
const snapshotHash=(state:GameState,memory:BotMemory)=>hash(JSON.stringify({state,memory},(_k,v)=>v instanceof Map?{map:[...v]}:v instanceof Set?{set:[...v]}:v));
const design={start:94000,seeds:16,modes:['civil_war','primordial','lidellut','troll'] as const,styles:['truthful','bluff','skill-aware-bluff'] as const,scope:'한 판의 current 진영 전체에서 고정 모델이 information을 고를 첫 장면 하나만 변경. 개별 봇의 첫 ally 제안만 자격 있음. 이후 전원 기본 정책.',arms:['original ally','information'],primary:'모든 고정 fixture의 최종 진영 점수차이, 시드블록95% bootstrap',secondary:'개입 장면만의 대응결과·즉시 마나·동맹 지연·다음 행동 차이·배우 생존',limit:'새 정책 학습/배포 실험이 아닌 단일 선택의 결정론적 대응 진단. RNG를 소비하는 행동 변경의 후속 난수 소비 차이도 총효과에 포함.',modelSha256:hash(readFileSync(modelFile))};
writeFileSync(resolve(out,'design.json'),JSON.stringify(design,null,2)+'\n');
interface Intervention {player:string;character:string;at:number;cell:string;original:Action;alternative:Action;beforeHash:string;beforeMana:number;result?:{ok:boolean;error?:string;manaSpent:number};firstOriginalAlly?:number;followups:{at:number;action:Action;ok:boolean}[];actorSurvived?:boolean}
interface Branch {game:MatchResult;intervention:Intervention|null}
interface Pair {fixture:Fixture;style:ClaimStyle;baseline:Branch;candidate:Branch;delta:number}
function run(f:Fixture,style:ClaimStyle,replace:boolean):Branch {
 const seen=new WeakSet<BotMemory>();let intervention:Intervention|null=null,awaiting=false;
 const game=playMatch(f,{current:(s,id,m,o)=>{
  const action=smartBotAction(s,id,m,o);
  if(intervention||seen.has(m)||action?.type!=='skill'||action.skill!=='ally')return action;
  const view=viewFor(s,id),ctx=context(view,botKnowledge(s,id,view,m),action);if(!ctx)return action;
  seen.add(m);if(model[ctx.cell]!.choice!=='information'||!ctx.alternative)return action;
  intervention={player:id,character:view.me.character,at:s.now,cell:ctx.cell,original:action,alternative:ctx.alternative,beforeHash:snapshotHash(s,m),beforeMana:view.me.mana,followups:[]};awaiting=true;
  return replace?ctx.alternative:action;
 },reference:claimOpponent(style)},undefined,(s,id,a,result)=>{
  if(!intervention||id!==intervention.player)return;
  if(awaiting){intervention.result={ok:result.ok,error:result.error,manaSpent:intervention.beforeMana-viewFor(s,id).me.mana};awaiting=false;}
  else intervention.followups.push({at:s.now-intervention.at,action:a,ok:result.ok});
  if(result.ok&&a.type==='skill'&&a.skill==='ally'&&intervention.original.type==='skill'&&a.target===intervention.original.target)intervention.firstOriginalAlly??=s.now-intervention.at;
 });
 // TS cannot infer closure assignment through playMatch.
 const observed=intervention as Intervention|null;
 if(observed){assert(observed.result);observed.actorSurvived=game.survivors.find(p=>p.character===observed.character)!.alive;}
 return {game,intervention:observed};
}
const pairs:Pair[]=[];
for(const mode of design.modes)for(const style of design.styles){
 for(let i=0;i<design.seeds;i++)for(const f of fixtures(mode,design.start+i,8+i%5)){
  const baseline=run(f,style,false),candidate=run(f,style,true),a=baseline.intervention,b=candidate.intervention;
  assert.equal(!!a,!!b);
  if(a&&b){for(const k of ['player','character','at','cell','original','alternative','beforeHash','beforeMana'] as const)assert.deepEqual(a[k],b[k]);}
  else assert.deepEqual(baseline.game,candidate.game);
  const score=(g:MatchResult)=>g.winnerPolicy==='current'?1:g.winnerPolicy==='reference'?0:.5;
  pairs.push({fixture:f,style,baseline,candidate,delta:score(candidate.game)-score(baseline.game)});
 }
 process.stderr.write(`[single] ${mode}/${style}\n`);
}
const active=pairs.filter(p=>p.baseline.intervention!==null);
const differences=Array.from({length:design.seeds},(_,i)=>{const group=pairs.filter(p=>p.fixture.seed===design.start+i);return group.reduce((n,p)=>n+p.delta,0)/group.length;});
const outcomes=(ps:Pair[])=>({same:ps.filter(p=>p.delta===0).length,improved:ps.filter(p=>p.delta>0).length,worsened:ps.filter(p=>p.delta<0).length});
const policy=(key:'baseline'|'candidate')=>({wins:pairs.filter(p=>p[key].game.winnerPolicy==='current').length,unfinished:pairs.filter(p=>p[key].game.winner===null).length,rejected:pairs.reduce((n,p)=>n+p[key].game.stats.current.rejected,0),earlyFailures:pairs.reduce((n,p)=>n+p[key].game.stats.current.earlyAttackFailures,0),interventionAccepted:active.filter(p=>p[key].intervention!.result!.ok).length,interventionMana:active.reduce((n,p)=>n+p[key].intervention!.result!.manaSpent,0),actorSurvived:active.filter(p=>p[key].intervention!.actorSurvived).length,originalAllyEventually:active.filter(p=>p[key].intervention!.firstOriginalAlly!==undefined).length});
const delays=active.flatMap(p=>p.candidate.intervention!.firstOriginalAlly===undefined?[]:[p.candidate.intervention!.firstOriginalAlly]).sort((a,b)=>a-b);
const equalAction=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const summary={pairs:pairs.length,games:pairs.length*2,intervened:active.length,preInterventionHashMatches:active.length,unchangedWithoutIntervention:pairs.length-active.length,baseline:policy('baseline'),candidate:policy('candidate'),delta:differences.reduce((a,b)=>a+b,0)/differences.length,seedDifferences:differences,seedBootstrap95:pairedInterval(differences.map(d=>(d+1)/2)).map(v=>v*2-1),allOutcomes:outcomes(pairs),intervenedOutcomes:outcomes(active),nextActionDifferent:active.filter(p=>!equalAction(p.baseline.intervention!.followups[0],p.candidate.intervention!.followups[0])).length,originalAllyDelay:{observed:delays.length,medianMs:delays.length?delays[Math.floor(delays.length/2)]:null,p90Ms:delays.length?delays[Math.floor(delays.length*.9)]:null},hashes:Object.fromEntries(['scripts/ally-single-intervention.ts','scripts/ally-context-model.ts','scripts/league-runner.ts','scripts/claim-opponents.ts','src/bot.ts'].map(p=>[p,hash(readFileSync(resolve(root,'packages/rules',p)))]))};
writeFileSync(resolve(out,'pairs.json.gz'),gzipSync(JSON.stringify(pairs)));
writeFileSync(resolve(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
