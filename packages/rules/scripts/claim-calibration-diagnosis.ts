// 같은 상태/기억에서 두 정책의 선택만 비교한다. 반사실 결과는 평가자만 보며 실게임에 전달하지 않는다.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {smartBotAction,viewFor,applyAction,botKnowledge,assignmentBelief,type Action,type PlayerView} from '../src/index.js';
import {nextRandom} from '../src/rng.js';
import {fixtures,playMatch,DEFAULT_SETTINGS,type Policy} from './league-runner.js';
import {claimOpponent} from './claim-opponents.js';
const root=resolve(import.meta.dirname,'../../..'),out=resolve(root,'docs/evaluations/claim-calibration-diagnosis');mkdirSync(out,{recursive:true});
const old=JSON.parse(gunzipSync(readFileSync(resolve(root,'docs/evaluations/claim-calibration/matches.json.gz'))).toString());
const key=(a:Action|null)=>a?.type==='skill'?a.skill:a?.type??'wait';
const counts:Record<string,number>={},records:unknown[]=[],games=[];
const bump=(k:string)=>counts[k]=(counts[k]??0)+1;
for(const scale of [1,4])for(const mode of ['civil_war','primordial','lidellut','troll'] as const)for(const style of ['truthful','bluff','skill-aware-bluff'] as const) {
 for(let i=0;i<8;i++)for(const fixture of fixtures(mode,83000+i,8+i%5)) {
  let pending:any;
  const current:Policy=(state,id,memory,options)=>{
   pending=undefined;
   if(nextRandom({rng:memory.rng})>(options.activity??.5))return smartBotAction(state,id,memory,{...options,claimEvidenceScale:scale});
   const before=structuredClone(memory),otherMemory=structuredClone(before);
   const action=smartBotAction(state,id,memory,{...options,claimEvidenceScale:scale});
   const alternative=smartBotAction(state,id,otherMemory,{...options,claimEvidenceScale:scale===1?4:1});
   const changed=JSON.stringify(action)!==JSON.stringify(alternative);
   bump(`${scale}:eligible`);if(changed)bump(`${scale}:changed:${key(action)}->${key(alternative)}`);
   if(!action)return action;
   const view=viewFor(state,id),target=action.type==='skill'?view.players.find(p=>p.id===action.target):undefined;
   const actualTarget=target&&state.players.find(p=>p.id===target.id);
   const altResult=changed&&alternative?applyAction(structuredClone(state),id,alternative,state.now):undefined;
   const knowledge=changed?botKnowledge(state,id,view,before):undefined;
   const beliefInfo=knowledge&&target?[1,4].map(alpha=>{
    const b=assignmentBelief(view,knowledge,structuredClone(before),alpha),probs=b.probabilities.get(target.id);
    return {alpha,ownSide:[...probs??[]].reduce((n,[c,p])=>n+(view.roster.find(r=>r.key===c)?.side===view.me.side?p:0),0),probabilities:[...probs??[]]};
   }):undefined;
   pending={scale,fixture,style,at:state.now,id,action,alternative,changed,alternativeResult:altResult,
    observation:{target,ownAllies:view.me.allies,skill:action.type==='skill'?view.me.skills.find(s=>s.key===action.skill):undefined},beliefInfo,
    evaluatorOnly:{actorSide:state.players.find(p=>p.id===id)!.side,targetSide:actualTarget?.side,targetCharacter:actualTarget?.character,protection:actualTarget?.effects.filter(e=>e.kind==='invulnerable'&&e.until>state.now)}};
   return action;
  };
  const result=playMatch(fixture,{current,reference:claimOpponent(style)},DEFAULT_SETTINGS,(_state,id,action,result)=>{
   if(!pending||pending.id!==id)return;
   bump(`${scale}:attempted`);
   if(!result.ok)bump(`${scale}:rejected:${result.error}`);
   if(pending.changed||!result.ok)records.push({...pending,result});
   if(result.ok&&action.type==='skill'&&action.skill==='ally')bump(`${scale}:accepted-ally:${pending.evaluatorOnly.actorSide===pending.evaluatorOnly.targetSide?'friend':'enemy'}`);
   pending=undefined;
  });
  const previous=old.find((g:any)=>Boolean(g.baseline)===(scale===1)&&g.style===style&&JSON.stringify(g.fixture)===JSON.stringify(fixture));
  assert(previous,'원자료 대결 누락');const {style:_,baseline:__,...original}=previous;assert.deepStrictEqual(result,original,'추적이 대전 결과를 변경함');
  games.push({scale,style,...result});
 }
 process.stderr.write(`[diagnosis] ${scale}/${mode}/${style} 완료\n`);
}
const payload=gzipSync(JSON.stringify(records));writeFileSync(resolve(out,'decisions.json.gz'),payload);
const files=['src/bot.ts','src/bot-belief.ts','scripts/claim-calibration-diagnosis.ts','scripts/league-runner.ts'];
writeFileSync(resolve(out,'summary.json'),JSON.stringify({format:1,scope:'83000–83007은 기존검증 이후 개발진단용으로 사용. 같은상태 대안의 즉시결과는 장기승패 인과증거가 아님. 실게임/메모리에 평가자정답·대안결과 미전달.',games:games.length,exactReplay:true,counts,records:records.length,sha256:createHash('sha256').update(payload).digest('hex'),hashes:Object.fromEntries(files.map(p=>[p,createHash('sha256').update(readFileSync(resolve(root,'packages/rules',p))).digest('hex')]))},null,2));
console.log(JSON.stringify(counts,null,2));
