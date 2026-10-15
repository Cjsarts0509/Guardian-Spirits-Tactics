import {describe,it,expect,beforeAll,afterAll} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {playCommitmentMatch} from '../scripts/cooperative-commitment-match.js';
import {DEFAULT_SETTINGS} from '../scripts/league-runner.js';
const f={mode:'civil_war' as const,seed:23,count:8,reversed:false,currentSide:1 as const},settings={...DEFAULT_SETTINGS,activity:.08,limitMs:240000};
const root=resolve('../..'),hash=(x:string|Buffer)=>createHash('sha256').update(x).digest('hex');
let dir:string,data:any,journal:string,idleData:any,idleJournal:string,forecastData:any,forecastJournal:string;
describe('한 턴 공표 유지의 실제 경기 관측과 독립 검증',()=>{
  beforeAll(()=>{
    dir=mkdtempSync(join(tmpdir(),'gst-commitment-test-'));const sourceHashes:Record<string,string>={};
    const walk=(path:string,prefix='')=>{for(const e of readdirSync(path,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=prefix+e.name;if(e.isDirectory())walk(join(path,e.name),p+'/');else if(e.name.endsWith('.ts'))sourceHashes['src/'+p]=hash(readFileSync(join(path,e.name)));}};walk('src');
    for(const p of ['cooperative-claim-commitment.ts','cooperative-commitment-match.ts','league-runner.ts','baselines/pre-cooperative.ts','claim-opponents.ts'])sourceHashes['scripts/'+p]=hash(readFileSync('scripts/'+p));
    const variants=['baseline','control','commitment'] as const,meta={format:1,kind:'claim-turn-commitment-comparison',phase:'development',count:1,start:23,settings,variants,
      options:{baseline:{},control:{},commitment:{claimTurnCommitment:true}},sourceHashes,auxiliarySourceHashes:{'tools/verify-claim-commitment.py':hash(readFileSync(join(root,'tools/verify-claim-commitment.py')))},design:{unit:'seed'}};
    const records=variants.map(variant=>({mode:f.mode,style:'truthful',variant,result:playCommitmentMatch(f,'truthful',variant,settings)}));
    const fingerprint=hash(JSON.stringify(meta));journal=JSON.stringify({type:'header',fingerprint,meta})+'\n'+records.map(x=>JSON.stringify(x)+'\n').join('');
    data={...meta,fingerprint,complete:false,executions:3,journalSha256:hash(journal),records};writeFileSync(join(dir,'journal.ndjson'),journal);
    const idleMeta={...meta,kind:'idle-manual-true-claim-mana-comparison',variants:['baseline','control','idleClaimMana'],options:{baseline:{},control:{},idleClaimMana:{idleClaimMana:true}}};
    const idleRecords=[...records.slice(0,2),{mode:f.mode,style:'truthful',variant:'idleClaimMana',result:playCommitmentMatch(f,'truthful','idleClaimMana',settings)}];
    const idleFingerprint=hash(JSON.stringify(idleMeta));idleJournal=JSON.stringify({type:'header',fingerprint:idleFingerprint,meta:idleMeta})+'\n'+idleRecords.map(x=>JSON.stringify(x)+'\n').join('');
    idleData={...idleMeta,fingerprint:idleFingerprint,complete:false,executions:3,journalSha256:hash(idleJournal),records:idleRecords};
    const forecastMeta={...meta,kind:'forecast-attack-budget-comparison',variants:['baseline','control','forecastAttackBudget'],options:{baseline:{},control:{},forecastAttackBudget:{forecastAttackBudget:true}}};
    const forecastRecords=[...records.slice(0,2),{mode:f.mode,style:'truthful',variant:'forecastAttackBudget',result:playCommitmentMatch(f,'truthful','forecastAttackBudget',settings)}];
    const forecastFingerprint=hash(JSON.stringify(forecastMeta));forecastJournal=JSON.stringify({type:'header',fingerprint:forecastFingerprint,meta:forecastMeta})+'\n'+forecastRecords.map(x=>JSON.stringify(x)+'\n').join('');
    forecastData={...forecastMeta,fingerprint:forecastFingerprint,complete:false,executions:3,journalSha256:hash(forecastJournal),records:forecastRecords};
  });
  afterAll(()=>rmSync(dir,{recursive:true,force:true}));
  const verify=(d:any=data,j=journal)=>{writeFileSync(join(dir,'raw.json'),JSON.stringify(d));writeFileSync(join(dir,'journal.ndjson'),j);return execFileSync('python',['tools/verify-claim-commitment.py',join(dir,'raw.json'),'--allow-partial','--journal-path',join(dir,'journal.ndjson')],{cwd:root,encoding:'utf8',stdio:['pipe','pipe','pipe']});};
  it('관측을 켜거나 꺼도 실제 경기 결과/행동 통계가 같다',()=>{
    const observed=data.records.find((x:any)=>x.variant==='commitment').result;
    expect(playCommitmentMatch(f,'truthful','commitment',settings,false).game).toEqual(observed.game);
  });
  it('실제 성공 공표 순마나·자기 턴 수신·유지 중 행동을 기록한다',()=>{
    const r=data.records.find((x:any)=>x.variant==='commitment').result;
    expect(r.holds.length).toBeGreaterThan(0);expect(r.turns.length).toBeGreaterThan(0);
    const pubs=r.actions.filter((x:any)=>x.accepted&&x.action.type==='skill'&&x.action.skill==='publish');expect(pubs.length).toBeGreaterThan(0);
    expect(r.resources.publishManaNet).toBe(pubs.reduce((n:number,x:any)=>n+x.afterMana-x.beforeMana,0));
    for(const x of pubs)expect(x.afterMana-x.beforeMana).toBe(Math.min(x.maxMana,x.beforeMana+5)-x.beforeMana);
    expect(r.resources.trueNameBonusGross).toBe(10*r.turns.filter((x:any)=>x.trueName).length);expect(r.safety.holdingFalsePublishes).toBe(0);
  });
  it('독립 Python 검증은 실제 경기/저널을 받아들이고 공표 순마나 변조를 거절한다',()=>{
    expect(JSON.parse(verify()).journalVerified).toBe(true);const bad=structuredClone(data);
    const pub=bad.records.flatMap((x:any)=>x.result.actions).find((x:any)=>x.accepted&&x.action.type==='skill'&&x.action.skill==='publish');pub.afterMana++;
    expect(()=>verify(bad)).toThrow();
  });
  it('유지 종료 시각·저널·소스 목록 변조를 거절한다',()=>{
    const bad=structuredClone(data);bad.records.find((x:any)=>x.variant==='commitment').result.holds[0].until++;
    expect(()=>verify(bad)).toThrow();expect(()=>verify(data,journal+'{}\n')).toThrow();
    const missing=structuredClone(data);delete missing.sourceHashes['src/bot.ts'];expect(()=>verify(missing)).toThrow();
  });
  it('실제 대기 재공표는 원래null/자기 기억/RNG 대응과 정확한+5수령을 검증한다',()=>{
    const r=idleData.records.find((x:any)=>x.variant==='idleClaimMana').result;
    expect(r.resources.reaffirmations).toBeGreaterThan(0);expect(r.resources.reaffirmManaNet).toBe(5*r.resources.reaffirmations);
    const pubs=r.actions.filter((x:any)=>x.accepted&&x.action.type==='skill'&&x.action.skill==='publish'&&x.action.name===x.beforePublished);
    for(const x of pubs){expect(x.reaffirmationProof).toEqual({originalNull:true,ownMemoryEqual:true,ownRngEqual:true});expect(x.manualSameName&&x.activeDecision&&x.beforeTrueName).toBe(true);}
    expect(JSON.parse(verify(idleData,idleJournal)).journalVerified).toBe(true);
    const bad=structuredClone(idleData),pub=bad.records.find((x:any)=>x.variant==='idleClaimMana').result.actions.find((x:any)=>x.reaffirmationProof);pub.reaffirmationProof.originalNull=false;
    expect(()=>verify(bad,idleJournal)).toThrow();
  });
  it('자기 기억 복제 관측을 켜거나 꺼도 대기 재공표 후보의 실제 경기가 같다',()=>{
    expect(playCommitmentMatch(f,'truthful','idleClaimMana',settings,false).game).toEqual(idleData.records.find((x:any)=>x.variant==='idleClaimMana').result.game);
  });
  it('다음 턴 예산 관측ON/OFF의 실제 경기와 행동 통계가 같고 독립 검증이 통과한다',()=>{
    const r=forecastData.records.find((x:any)=>x.variant==='forecastAttackBudget').result;
    expect(playCommitmentMatch(f,'truthful','forecastAttackBudget',settings,false).game).toEqual(r.game);
    expect(JSON.parse(verify(forecastData,forecastJournal)).journalVerified).toBe(true);
  });
  it('예산 후보를 다른 옵션과 섞거나 보유하지 않은 예산 증거를 삽입하면 거절한다',()=>{
    const bad=structuredClone(forecastData);bad.options.forecastAttackBudget.idleClaimMana=true;expect(()=>verify(bad,forecastJournal)).toThrow();
    const forged=structuredClone(forecastData);forged.records.find((x:any)=>x.variant==='control').result.budgets.push({plan:{skill:'advanced_attack'},at:0});expect(()=>verify(forged,forecastJournal)).toThrow();
  });
});
