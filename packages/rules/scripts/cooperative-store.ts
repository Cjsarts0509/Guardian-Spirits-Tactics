// Evaluation storage only. Immutable game records are authoritative; exports are verified projections.
import {createHash,randomUUID} from 'node:crypto';
import {mkdirSync,existsSync,readFileSync,writeFileSync,openSync,closeSync,fsyncSync,renameSync,readdirSync,unlinkSync,statSync,fstatSync,ftruncateSync,writeSync} from 'node:fs';
import {dirname,join} from 'node:path';
export const storeHash=(x:string|Buffer)=>createHash('sha256').update(x).digest('hex');
const json=(x:unknown)=>JSON.stringify(x);
function atomic(path:string,text:string){
  const tmp=path+'.'+randomUUID()+'.tmp',fd=openSync(tmp,'wx');
  try{writeFileSync(fd,text);fsyncSync(fd);}finally{closeSync(fd);}
  if(readFileSync(tmp,'utf8')!==text)throw Error('storage temporary readback mismatch: '+path);
  renameSync(tmp,path);const dir=openSync(dirname(path),'r');try{fsyncSync(dir);}finally{closeSync(dir);}
  if(readFileSync(path,'utf8')!==text)throw Error('storage published readback mismatch: '+path);
}
export interface StoreOptions<R>{out:string;meta:object;fingerprint:string;expectedCount:number;key:(record:R)=>string;project:(snapshot:any)=>R[];leaseMs?:number}
interface Envelope<R>{version:2;fingerprint:string;ordinal:number;key:string;sha256:string;record:R}
export function recoverExpiredStoreLock(out:string,expectedOwner:string,now=Date.now()){
  const path=out+'.store/WRITER.lock',lock=JSON.parse(readFileSync(path,'utf8'));
  if(lock.owner!==expectedOwner||!Number.isFinite(lock.leaseUntil)||lock.leaseUntil>now)throw Error('storage lock owner/expiry mismatch');
  unlinkSync(path);
}
export class CooperativeStore<R>{
  readonly records:R[]=[];
  readonly journal:string;
  readonly publication:string;
  private lockFd:number;private root:string;private owner=randomUUID();private closed=false;private keys=new Set<string>();private exit=()=>this.close();
  constructor(private opts:StoreOptions<R>){
    if(!Number.isSafeInteger(opts.expectedCount)||opts.expectedCount<1||storeHash(json(opts.meta))!==opts.fingerprint)throw Error('storage design mismatch');
    this.root=opts.out+'.store';this.journal=opts.out.replace(/\.json$/,'')+'.journal.ndjson';this.publication=opts.out.replace(/\.json$/,'')+'.publication.json';
    mkdirSync(join(this.root,'records'),{recursive:true});const lock=join(this.root,'WRITER.lock');
    this.lockFd=openSync(lock,'wx');writeFileSync(this.lockFd,json({owner:this.owner,pid:process.pid,leaseUntil:Date.now()+(opts.leaseMs??300000)}));fsyncSync(this.lockFd);
    process.once('exit',this.exit);
    try{
      const metadata=join(this.root,'metadata.json'),text=json({version:2,fingerprint:opts.fingerprint,meta:opts.meta});
      if(existsSync(metadata)){if(readFileSync(metadata,'utf8')!==text)throw Error('storage source/fingerprint mismatch');}else atomic(metadata,text);
      const entries=readdirSync(join(this.root,'records')).filter(x=>x.endsWith('.json')).map(file=>{
        const e=JSON.parse(readFileSync(join(this.root,'records',file),'utf8')) as Envelope<R>;
        if(e.version!==2||e.fingerprint!==opts.fingerprint||e.key!==opts.key(e.record)||file!==storeHash(e.key)+'.json'||e.sha256!==storeHash(json(e.record)))throw Error('storage record integrity mismatch');
        return e;
      }).sort((a,b)=>a.ordinal-b.ordinal);
      for(const e of entries){if(e.ordinal!==this.records.length||this.keys.has(e.key))throw Error('storage missing/duplicate ordinal');this.keys.add(e.key);this.records.push(e.record);}
      const head=join(this.root,'HEAD.json');
      if(existsSync(head)){
        const h=JSON.parse(readFileSync(head,'utf8'));
        if(h.fingerprint!==opts.fingerprint||!Number.isSafeInteger(h.count)||h.count<0||h.count>entries.length||
          h.count>0&&(h.key!==entries[h.count-1]!.key||h.sha256!==entries[h.count-1]!.sha256))throw Error('storage acknowledged record missing');
      }
      if(!entries.length&&(existsSync(opts.out)||existsSync(this.journal)||existsSync(this.publication))){
        // A cloned repository may contain only verified exports, not the local immutable cache.
        if(!existsSync(opts.out)||!existsSync(this.journal)||!existsSync(this.publication))throw Error('storage incomplete exports without canonical records');
        const snapshot=readFileSync(opts.out,'utf8'),journal=readFileSync(this.journal,'utf8'),pub=JSON.parse(readFileSync(this.publication,'utf8')),s=JSON.parse(snapshot);
        if(pub.version!==2||typeof pub.complete!=='boolean'||pub.complete&&pub.executions!==opts.expectedCount||pub.fingerprint!==opts.fingerprint||pub.snapshotSHA256!==storeHash(snapshot)||pub.journalSHA256!==storeHash(journal)||s.fingerprint!==opts.fingerprint||s.journalSha256!==pub.journalSHA256)throw Error('storage export publication mismatch');
        const lines=journal.trimEnd().split('\n'),header=JSON.parse(lines.shift()!);
        if(json(header)!==json({type:'header',fingerprint:opts.fingerprint,meta:opts.meta}))throw Error('storage export metadata mismatch');
        const records=lines.map(x=>JSON.parse(x) as R);
        if(json(opts.project(s))!==json(records)||pub.executions!==records.length||s.executions!==records.length||pub.complete!==s.complete)throw Error('storage export record-set mismatch');
        for(const r of records)this.append(r);
      }
      if(this.records.length>opts.expectedCount)throw Error('storage excess records');
      this.refreshLock();
    }catch(e){this.close();throw e;}
  }
  private assertOwner(){
    if(this.closed||!existsSync(join(this.root,'WRITER.lock'))||statSync(join(this.root,'WRITER.lock')).ino!==fstatSync(this.lockFd).ino||JSON.parse(readFileSync(join(this.root,'WRITER.lock'),'utf8')).owner!==this.owner)throw Error('storage writer ownership lost');
  }
  private refreshLock(){this.assertOwner();const text=json({owner:this.owner,pid:process.pid,leaseUntil:Date.now()+(this.opts.leaseMs??300000)});writeSync(this.lockFd,text,0,'utf8');ftruncateSync(this.lockFd,Buffer.byteLength(text));fsyncSync(this.lockFd);this.assertOwner();}
  append(record:R){
    this.assertOwner();const key=this.opts.key(record);if(this.keys.has(key)||this.records.length>=this.opts.expectedCount)throw Error('storage duplicate/excess game');
    const path=join(this.root,'records',storeHash(key)+'.json');if(existsSync(path))throw Error('storage conflicting immutable record');
    const e:Envelope<R>={version:2,fingerprint:this.opts.fingerprint,ordinal:this.records.length,key,sha256:storeHash(json(record)),record};
    atomic(path,json(e));this.assertOwner();atomic(join(this.root,'HEAD.json'),json({fingerprint:this.opts.fingerprint,count:e.ordinal+1,key,sha256:e.sha256}));
    this.records.push(record);this.keys.add(key);this.refreshLock();
  }
  checkpoint(snapshot:any){
    this.assertOwner();
    if(snapshot.fingerprint!==this.opts.fingerprint||snapshot.executions!==this.records.length||snapshot.complete&&this.records.length!==this.opts.expectedCount||json(this.opts.project(snapshot))!==json(this.records))throw Error('storage snapshot record-set mismatch');
    for(let i=0;i<this.records.length;i++){const r=this.records[i]!,key=this.opts.key(r),e=JSON.parse(readFileSync(join(this.root,'records',storeHash(key)+'.json'),'utf8'));if(e.ordinal!==i||e.fingerprint!==this.opts.fingerprint||e.key!==key||e.sha256!==storeHash(json(r))||json(e.record)!==json(r))throw Error('storage canonical record changed');}
    // Never copy an on-disk append-log hash into a separately constructed snapshot.
    const journal=json({type:'header',fingerprint:this.opts.fingerprint,meta:this.opts.meta})+'\n'+this.records.map(x=>json(x)+'\n').join('');
    const projected={...snapshot,journalSha256:storeHash(journal)},text=JSON.stringify(projected,null,2);
    atomic(this.journal,journal);atomic(this.opts.out,text);this.assertOwner();
    const pub={version:2,fingerprint:this.opts.fingerprint,executions:this.records.length,complete:projected.complete,snapshotSHA256:storeHash(text),journalSHA256:storeHash(journal)};
    atomic(this.publication,JSON.stringify(pub,null,2));this.refreshLock();return projected;
  }
  close(){
    if(this.closed)return;this.closed=true;process.removeListener('exit',this.exit);
    const p=join(this.root,'WRITER.lock');try{if(existsSync(p)&&statSync(p).ino===fstatSync(this.lockFd).ino)unlinkSync(p);}finally{closeSync(this.lockFd);}
  }
}
