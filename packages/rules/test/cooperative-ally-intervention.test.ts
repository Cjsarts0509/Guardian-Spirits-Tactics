import {describe,it,expect,beforeAll,afterAll} from 'vitest';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,readdirSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {botKnowledge,createBotMemory,smartBotAction,viewFor} from '../src/index.js';
import {firstLowManaAllyProposal,playAllyIntervention} from '../scripts/cooperative-ally-intervention.js';
import {DEFAULT_SETTINGS} from '../scripts/league-runner.js';
import {civilTable} from './helpers.js';
const f={mode:'civil_war' as const,seed:23,count:8,reversed:false,currentSide:2 as const},settings={...DEFAULT_SETTINGS,activity:.08,limitMs:240000},root=resolve('../..');
const hash=(x:string|Buffer)=>createHash('sha256').update(x).digest('hex');let dir:string,data:any,journal:string;
function own(){const t=civilTable();t.state.revealed[t.id.kelhu!]='kelhu';t.p('mertz').mana=35;const m=createBotMemory(2),v=viewFor(t.state,t.id.mertz!),k=botKnowledge(t.state,t.id.mertz!,v,m);return {v,k,m,a:{type:'skill' as const,skill:'ally',target:t.id.kelhu}};}
describe('확정 아군 동맹 한 번 지연의 자기 정보 경계와 대응 경기',()=>{
 beforeAll(()=>{
  dir=mkdtempSync(join(tmpdir(),'gst-ally-pairs-'));const sourceHashes:Record<string,string>={};
  const walk=(path:string,prefix='')=>{for(const e of readdirSync(path,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const p=prefix+e.name;if(e.isDirectory())walk(join(path,e.name),p+'/');else if(e.name.endsWith('.ts'))sourceHashes['src/'+p]=hash(readFileSync(join(path,e.name)));}};walk('src');
  for(const p of ['cooperative-ally-pairs.ts','cooperative-ally-intervention.ts','cooperative-claim-intervention.ts','league-runner.ts','baselines/pre-cooperative.ts','claim-opponents.ts'])sourceHashes['scripts/'+p]=hash(readFileSync('scripts/'+p));
  const auxiliarySourceHashes=Object.fromEntries(['verify-ally-pairs.py','learn-ally-delay.py'].map(p=>['tools/'+p,hash(readFileSync(join(root,'tools',p)))]));
  const meta={format:1,kind:'first-low-mana-confirmed-ally-single-delay',phase:'training-diagnostic',start:23,count:1,settings,selectedPublicPlayer:'p1',sourceHashes,auxiliarySourceHashes,
   learning:{features:['knownEnemy','afterManaLessThan20'],cells:4,minPairs:48,minSeeds:16,bootstrapSamples:10000,bootstrapSeed:0x475354,selection:'seed99LowerPositive'}};
  const control=playAllyIntervention(f,'truthful',false,settings),delay=playAllyIntervention(f,'truthful',true,settings),fingerprint=hash(JSON.stringify(meta));
  journal=JSON.stringify({type:'header',fingerprint,meta})+'\n'+[['control',control],['delay',delay]].map(([variant,result])=>JSON.stringify({type:'game',mode:f.mode,style:'truthful',variant,result})+'\n').join('');
  data={...meta,fingerprint,complete:false,executions:2,journalSha256:hash(journal),rows:[{mode:f.mode,style:'truthful',pairs:[{fixture:f,control,delay}]}]};
 });
 afterAll(()=>rmSync(dir,{recursive:true,force:true}));
 const verify=(d:any=data,j=journal)=>{writeFileSync(join(dir,'raw.json'),JSON.stringify(d));writeFileSync(join(dir,'journal.ndjson'),j);return execFileSync('python',['tools/verify-ally-pairs.py',join(dir,'raw.json'),'--allow-partial','--journal-path',join(dir,'journal.ndjson')],{cwd:root,encoding:'utf8',stdio:['pipe','pipe','pipe']});};
 it('자기 뷰/확정 지식/원래 제안만 사용하며 기억/RNG를 바꾸지 않는다',()=>{const x=own(),before=structuredClone(x);expect(firstLowManaAllyProposal(x.v,x.k,x.a,false)).toMatchObject({cell:'E0L0',before:{afterMana:25,allyCost:10}});expect(x).toEqual(before);});
 it('보고/공표만 있는 미확인 대상과 확정 적에는 개입하지 않는다',()=>{const {v,k,a}=own();k.known.clear();expect(firstLowManaAllyProposal(v,k,a,false)).toBeNull();k.known.set(a.target!,'kaspa');expect(firstLowManaAllyProposal(v,k,a,false)).toBeNull();});
 it('첫 회만 적용하고 공격/파기/대기/충분한 마나/기존 동맹/공개 보호는 건드리지 않는다',()=>{
  const {v,k,a}=own();expect(firstLowManaAllyProposal(v,k,a,true)).toBeNull();for(const skill of ['attack','break_ally'])expect(firstLowManaAllyProposal(v,k,{...a,skill},false)).toBeNull();expect(firstLowManaAllyProposal(v,k,null,false)).toBeNull();
  v.me.mana=60;expect(firstLowManaAllyProposal(v,k,a,false)).toBeNull();v.me.mana=59;expect(firstLowManaAllyProposal(v,k,a,false)).not.toBeNull();
  v.me.allies.push(a.target!);expect(firstLowManaAllyProposal(v,k,a,false)).toBeNull();v.me.allies=[];v.players.find(p=>p.id===a.target)!.statuses.push({kind:'invulnerable',source:'rune_protection',remainingMs:1000});expect(firstLowManaAllyProposal(v,k,a,false)).toBeNull();
 });
 it('개입 전 상태/자기 기억/자기 뷰/제안 해시가 같고 딱 한 번만 대기로 바꾼다',()=>{
  const {control:a,delay:b}=data.rows[0].pairs[0];expect(a.point).not.toBeNull();
  for(const k of ['at','player','cell','stateHash','memoryHash','viewHash','before','original'])expect(b.point[k]).toEqual(a.point[k]);
  expect(a.point.accepted).toBe(true);expect(b.point.executed).toBeNull();expect(b.forcedChanges).toBe(1);expect(a.forcedChanges).toBe(0);
  expect(b.actions.some((x:any)=>x.at===b.point.at&&x.action.type==='skill'&&x.action.skill==='ally')).toBe(false);
 });
 it('지연한 동맹을 후속 실제 행동에서 다시 걸고 대화도 별도로 계속한다',()=>{
  const b=data.rows[0].pairs[0].delay;expect(b.resources.firstSameAllyDelayMs).toBeGreaterThan(0);expect(b.actions.some((x:any)=>x.action.type==='chat')).toBe(true);
 });
 it('관측ON/OFF의 실제 지연 경기와 행동 통계가 같다',()=>expect(playAllyIntervention(f,'truthful',true,settings,'p1',false).game).toEqual(data.rows[0].pairs[0].delay.game));
 it('선정되지 않은 공개ID에서는 두 대응 실행 전체가 같다',()=>expect(playAllyIntervention(f,'truthful',true,settings,'not-a-player')).toEqual(playAllyIntervention(f,'truthful',false,settings,'not-a-player')));
 it('독립 검증이 실제 비용/저널을 받고 해시·순마나·개입 변조를 거절한다',()=>{
  expect(JSON.parse(verify()).journalVerified).toBe(true);
  const a=structuredClone(data);a.rows[0].pairs[0].delay.point.stateHash='0'.repeat(64);expect(()=>verify(a)).toThrow();
  const b=structuredClone(data);b.rows[0].pairs[0].control.resources.allyManaNet++;expect(()=>verify(b)).toThrow();
  const c=structuredClone(data);c.rows[0].pairs[0].delay.point.executed=c.rows[0].pairs[0].delay.point.original;expect(()=>verify(c)).toThrow();
 });
});
