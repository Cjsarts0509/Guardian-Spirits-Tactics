import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createBotMemory,botKnowledge,smartBotAction,viewFor} from '../src/index.js';
import {firstTrustedReportProposal,playReportIntervention} from '../scripts/cooperative-report-intervention.js';
import {civilTable,fill} from './helpers.js';
const root=resolve('../..');let dir:string,data:any,raw:string,journal:string;
function scenario(){
 const t=civilTable();fill(t,'freya');t.p('freya').gem=3;t.p('freya').gemCooldownUntil=0;
 t.state.revealed[t.id.kelhu!]='kelhu';t.act('kelhu',{type:'chat',channel:'whisper',to:t.id.freya,text:`확인 정보: [${t.p('reindila').seat}] 레인딜라`});
 t.p('freya').skills=t.p('freya').skills.filter(s=>s.key==='scan');
 const m=createBotMemory(7),a=smartBotAction(t.state,t.id.freya!,m,{activity:1}),v=viewFor(t.state,t.id.freya!),k=botKnowledge(t.state,t.id.freya!,v,m);
 return {t,m,a,v,k};
}
describe('one actual trusted-report verification alternative',()=>{
 beforeAll(()=>{
  dir=mkdtempSync(join(tmpdir(),'gst-report-pairs-'));raw=join(dir,'pairs.json');journal=join(dir,'pairs.journal.ndjson');
  execFileSync(process.execPath,['--import','tsx','scripts/cooperative-report-pairs.ts','1','23',raw,'0'],{encoding:'utf8',timeout:90000,stdio:['pipe','pipe','pipe']});
  data=JSON.parse(readFileSync(raw,'utf8'));
 },120000);
 afterAll(()=>rmSync(dir,{recursive:true,force:true}));
 const verify=(path=raw)=>JSON.parse(execFileSync('python',['tools/verify-report-pairs.py',path,'--journal-path',journal],{cwd:root,encoding:'utf8',stdio:['pipe','pipe','pipe']}));
 it('selects the original trusted report action using only own knowledge and preserves memory',()=>{
  const x=scenario(),before=structuredClone(x.m);expect(x.a).toMatchObject({type:'skill',skill:'scan'});
  expect(firstTrustedReportProposal(x.v,x.k,x.m,x.a,null,false)).toMatchObject({cell:'all',before:{targetKnown:false,originalMana:20},alternative:null});
  expect(x.m).toEqual(before);expect(x.k.known.has(x.t.id.reindila!)).toBe(false);
  expect(firstTrustedReportProposal(x.v,x.k,x.m,x.a,null,true)).toBeNull();
 });
 it('rejects missing, enemy, conflicting and directly contradicted reports and other actions',()=>{
  const x=scenario();for(const skill of ['ally','break_ally','attack'])expect(firstTrustedReportProposal(x.v,x.k,x.m,{type:'skill',skill,target:x.t.id.reindila},null,false)).toBeNull();
  expect(firstTrustedReportProposal(x.v,x.k,x.m,null,null,false)).toBeNull();
  const noReport=structuredClone(x.m);noReport.perception!.intel=undefined;expect(firstTrustedReportProposal(x.v,x.k,noReport,x.a,null,false)).toBeNull();
  const bad=structuredClone(x.k);bad.known.set(x.t.id.kelhu!,'kaspa');expect(firstTrustedReportProposal(x.v,bad,x.m,x.a,null,false)).toBeNull();
  const conflict=structuredClone(x.m),k=structuredClone(x.k);k.known.set(x.t.id.mertz!,'mertz');conflict.perception!.intel!.reports.get(x.t.id.reindila!)!.set(x.t.id.mertz!,{character:'mertz',at:0,seq:1});
  expect(firstTrustedReportProposal(x.v,k,conflict,x.a,null,false)).toBeNull();
  const known=structuredClone(x.k);known.known.set(x.t.id.reindila!,'reindila');expect(firstTrustedReportProposal(x.v,known,x.m,x.a,null,false)).toBeNull();
 });
 it('validates real paired prestate hashes, receipts, grid and journal independently',()=>{
  const s=verify();expect(s.executions).toBe(96);expect(s.journalVerified).toBe(true);expect(s.intervenedPairs).toBeGreaterThan(0);
  expect(s.nonIntervenedEqualPairs+s.intervenedPairs).toBe(48);expect(s.selection.candidate).toBe(false);
  const p=data.rows.flatMap((r:any)=>r.pairs).find((p:any)=>p.control.point);expect(p.normal.forcedChanges).toBe(1);
  for(const key of ['stateHash','viewHash','memoryHash','alternativeMemoryHash','original','alternative'])expect(p.normal.point[key]).toEqual(p.control.point[key]);
 });
 it('observing the one-decision alternative leaves the actual game unchanged',()=>{
  const row=data.rows.find((r:any)=>r.pairs.some((p:any)=>p.control.point)),p=row.pairs.find((p:any)=>p.control.point);
  expect(playReportIntervention(p.fixture,row.style,true,data.settings,'p1',false).game).toEqual(p.normal.game);
 });
 it('rejects raw action, resource, prestate or journal tampering',()=>{
  const copy=structuredClone(data),p=copy.rows.flatMap((r:any)=>r.pairs).find((p:any)=>p.control.point);p.normal.point.alternativeMemoryHash='0'.repeat(64);const bad=join(dir,'bad.json');writeFileSync(bad,JSON.stringify(copy));expect(()=>verify(bad)).toThrow();
  p.normal.point.alternativeMemoryHash=p.control.point.alternativeMemoryHash;p.normal.resources.allyManaNet++;writeFileSync(bad,JSON.stringify(copy));expect(()=>verify(bad)).toThrow();
 });
 it('completes a zero-new-game resume with identical records and no partial snapshot writes',()=>{
  const before=readFileSync(journal,'utf8'),hook=join(dir,'hook.mjs'),writes=join(dir,'writes');
  writeFileSync(hook,`import fs from 'node:fs';import {syncBuiltinESMExports} from 'node:module';const old=fs.writeFileSync;fs.writeFileSync=function(p,d,...a){if(typeof d==='string'&&d.includes('"rows"'))fs.appendFileSync(process.env.GST_WRITES,JSON.stringify({complete:JSON.parse(d).complete})+'\\n');return old.call(this,p,d,...a);};syncBuiltinESMExports();`);
  const log=execFileSync(process.execPath,['--import','tsx','--import',hook,'scripts/cooperative-report-pairs.ts','1','23',raw,'8'],{encoding:'utf8',env:{...process.env,GST_WRITES:writes},stdio:['pipe','pipe','pipe']});
  expect(log).toBe('');expect(readFileSync(journal,'utf8')).toBe(before);expect(readFileSync(writes,'utf8').trim()).toBe('{"complete":true}');expect(verify().complete).toBe(true);
 });
});
