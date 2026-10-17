// 완료 개발 표본의 제한 결정론 재생. 관측 결과를 정책으로 돌려보내지 않는다.
import {readFileSync,writeFileSync,renameSync,openSync,fsyncSync,closeSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {playCheckSingle,type OwnCheckAttackTrace} from './cooperative-check-single.js';
import {diagnosticHash} from './cooperative-claim-intervention.js';
const [input,out]=process.argv.slice(2);if(!input||!out)throw Error('input.json.gz out.json');
const outputPath:string=out;
const bytes=readFileSync(input),d=JSON.parse((input.endsWith('.gz')?gunzipSync(bytes):bytes).toString());
if(d.kind!=='public-p1-first-private-check-single-attack'||!d.complete||d.start!==142000||d.count!==32||d.executions!==3072)throw Error('완료030 개발 자료만 허용');
const records=d.records.filter((x:any)=>x.result.actions.some((a:any)=>a.attackFailure));
if(records.length!==23)throw Error('사전 등록23재생 상한 불일치');
const audit:{kind:string;sourceInputSHA256:string;researchExecutions:number;replayGames:number;maximumReplayGames:number;complete:boolean;rows:any[]}={kind:'own-attack-failure-receipt-replay',sourceInputSHA256:createHash('sha256').update(bytes).digest('hex'),researchExecutions:0,replayGames:0,maximumReplayGames:23,complete:false,rows:[]};
function publish(){
 const p=outputPath+'.tmp',raw=JSON.stringify(audit,null,2)+'\n';writeFileSync(p,raw);const fd=openSync(p,'r');fsyncSync(fd);closeSync(fd);
 if(readFileSync(p,'utf8')!==raw)throw Error('재생 자료 readback 불일치');renameSync(p,outputPath);
}
for(const x of records){
 const traces:OwnCheckAttackTrace[]=[],r=playCheckSingle(x.result.game.fixture,x.style,x.variant==='single',d.settings,'p1',true,e=>traces.push(e));
 if(diagnosticHash(r)!==diagnosticHash(x.result))throw Error('고정 개발 원본과 실제 재생 결과 불일치');
 const failures=traces.filter(t=>t.attackFailure);if(failures.length!==x.result.actions.filter((a:any)=>a.attackFailure).length)throw Error('실패 영수증 개수 불일치');
 const classified=failures.map(t=>{
  if(t.action.type!=='skill'||!t.action.target||!t.action.name)throw Error('이름 공격만 분류');
  const {target,name}=t.action,known=new Map(t.known).get(target)??null,lastFailure=new Map(new Map(t.lastFailure).get(target)??[]).get(name)??null;
  const directSinceFailure=t.privateEvidence.filter(e=>(lastFailure===null||e.at>lastFailure)&&e.facts?.some(f=>f.player===target&&f.character===name&&!f.oneOf));
  const kinds=t.ownResultEvents.map(e=>e.kind);
  return {at:t.at,action:t.action,actor:t.view.me.character,knownName:known,candidates:new Map(t.candidates).get(target)??[],
   previousSameNameFailureAt:lastFailure,newDirectIdentitySinceFailure:directSinceFailure.map(e=>e.seq),
   advancedLevel:t.view.me.skills.find(s=>s.key==='advanced_attack')?.level??null,
   warning:kinds.includes('attack.fail.warn'),death:kinds.includes('attack.fail.death'),
   hasPublicTargetIdentity:t.view.players.find(p=>p.id===target)?.revealed===name,
   observationLimit:'Name error and absolute guard are indistinguishable from the own failure receipt; no hidden cause inferred.'};
 });
 audit.rows.push({fixture:x.result.game.fixture,style:x.style,variant:x.variant,originalResultSHA256:diagnosticHash(x.result),replayedResultSHA256:diagnosticHash(r),failures:classified,traces:failures});audit.replayGames++;audit.complete=audit.replayGames===records.length;publish();
 process.stderr.write(`재생 ${audit.replayGames}/${records.length}, 신규 연구0\n`);
}
