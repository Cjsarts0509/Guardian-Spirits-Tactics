import {describe,it,expect,afterEach} from 'vitest';
import {mkdtempSync,readFileSync,writeFileSync,rmSync,readdirSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {CooperativeStore,storeHash,recoverExpiredStoreLock} from '../scripts/cooperative-store.js';
const dirs:string[]=[];const meta={test:'storage-fault-injection',persistence:{version:2}},fingerprint=storeHash(JSON.stringify(meta));
type R={id:number;value:string};
const setup=()=>{const dir=mkdtempSync(join(tmpdir(),'gst-store-'));dirs.push(dir);return join(dir,'data.json');};
const opts=(out:string)=>({out,meta,fingerprint,expectedCount:2,key:(r:R)=>String(r.id),project:(s:any)=>s.records as R[]});
const snapshot=(s:CooperativeStore<R>,complete=true)=>({...meta,fingerprint,executions:s.records.length,complete,records:s.records});
const r1={id:1,value:'first'},r2={id:2,value:'second'};
afterEach(()=>{for(const d of dirs.splice(0))rmSync(d,{recursive:true,force:true});});
describe('authoritative evaluation records',()=>{
 it('reproduces old false-complete failure then repairs missing journal lines without rerunning games',()=>{
  const out=setup(),s=new CooperativeStore(opts(out));s.append(r1);s.append(r2);s.checkpoint(snapshot(s));
  const lines=readFileSync(s.journal,'utf8').split('\n');lines.splice(1,1);writeFileSync(s.journal,lines.join('\n'));
  const old=JSON.parse(readFileSync(out,'utf8'));old.journalSha256=storeHash(readFileSync(s.journal));writeFileSync(out,JSON.stringify(old));
  expect(old.complete).toBe(true);expect(old.executions).toBe(2);expect(lines.filter(Boolean).length-1).toBe(1);
  s.close();const resumed=new CooperativeStore(opts(out));expect(resumed.records).toEqual([r1,r2]);resumed.checkpoint(snapshot(resumed));
  expect(readFileSync(resumed.journal,'utf8').trim().split('\n')).toHaveLength(3);resumed.close();
 });
 it('restores a cloned cache only from the exact published snapshot+journal pair',()=>{
  const out=setup(),s=new CooperativeStore(opts(out));s.append(r1);s.append(r2);s.checkpoint(snapshot(s));s.close();rmSync(out+'.store',{recursive:true});
  const restored=new CooperativeStore(opts(out));expect(restored.records).toEqual([r1,r2]);restored.close();rmSync(out+'.store',{recursive:true});
  writeFileSync(out,readFileSync(out,'utf8')+' ');expect(()=>new CooperativeStore(opts(out))).toThrow(/publication/);
 });
 it('rejects missing and duplicate games and false completion',()=>{
  const out=setup(),s=new CooperativeStore(opts(out));s.append(r1);expect(()=>s.append(r1)).toThrow(/duplicate/);
  expect(()=>s.checkpoint(snapshot(s))).toThrow(/record-set/);expect(()=>s.checkpoint({...snapshot(s,false),records:[]})).toThrow(/record-set/);
  s.checkpoint(snapshot(s,false));s.close();
 });
 it('refuses simultaneous writers and fences an explicitly expired owner',()=>{
  const out=setup(),s=new CooperativeStore(opts(out));expect(()=>new CooperativeStore(opts(out))).toThrow(/EEXIST/);
  const lock=out+'.store/WRITER.lock',l=JSON.parse(readFileSync(lock,'utf8'));
  expect(()=>recoverExpiredStoreLock(out,'wrong',l.leaseUntil+1)).toThrow(/owner/);
  expect(()=>recoverExpiredStoreLock(out,l.owner,l.leaseUntil-1)).toThrow(/expiry/);
  recoverExpiredStoreLock(out,l.owner,l.leaseUntil+1);const next=new CooperativeStore(opts(out));
  expect(()=>s.append(r1)).toThrow(/ownership/);s.close();next.append(r1);next.close();
 });
 it('refuses corrupted acknowledged canonical records before publishing',()=>{
  const out=setup(),s=new CooperativeStore(opts(out));s.append(r1);const file=join(out+'.store/records',readdirSync(out+'.store/records')[0]!);
  const envelope=JSON.parse(readFileSync(file,'utf8'));envelope.record.value='tampered';writeFileSync(file,JSON.stringify(envelope));
  expect(()=>s.checkpoint(snapshot(s,false))).toThrow(/changed/);s.close();expect(()=>new CooperativeStore(opts(out))).toThrow(/integrity/);
 });
 it('recovers a record committed before the HEAD acknowledgement and rejects deletion afterward',()=>{
  const out=setup(),s=new CooperativeStore(opts(out));s.append(r1);s.close();unlinkSync(out+'.store/HEAD.json');
  const orphan=new CooperativeStore(opts(out));expect(orphan.records).toEqual([r1]);orphan.append(r2);orphan.close();
  unlinkSync(join(out+'.store/records',storeHash('2')+'.json'));expect(()=>new CooperativeStore(opts(out))).toThrow(/acknowledged/);
 });
 it('rebuilds partially replaced exports from canonical records after interrupted publication',()=>{
  const out=setup(),s=new CooperativeStore(opts(out));s.append(r1);s.checkpoint(snapshot(s,false));s.append(r2);writeFileSync(out,'{"partial":');s.close();
  const resumed=new CooperativeStore(opts(out));const x=resumed.checkpoint(snapshot(resumed));expect(x.complete).toBe(true);expect(x.executions).toBe(2);resumed.close();
 });
});
