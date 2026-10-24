import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {strictEqual,deepStrictEqual,ok} from 'node:assert';
const plan=JSON.parse(readFileSync(process.argv[2],'utf8'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const manifestText=readFileSync(plan.manifest,'utf8'),manifest=JSON.parse(manifestText);
strictEqual(sha(manifestText),plan.manifestSHA256);
const {CooperativeStore}=await import(pathToFileURL(plan.frozen+'/packages/rules/scripts/cooperative-store.ts').href);
const rows=new Map();let meta;
for(const w of plan.workers){
 const raw=readFileSync(w.out),data=JSON.parse(raw),pub=JSON.parse(readFileSync(w.out.replace(/\.json$/,'.publication.json'),'utf8'));
 strictEqual(sha(raw),pub.snapshotSHA256);strictEqual(data.sourceRef,plan.sourceRef);
 const clean=Object.fromEntries(Object.entries(data).filter(([k])=>!['fingerprint','executions','expectedReplays','complete','records','journalSha256','manifest','manifestSHA256'].includes(k)));
 if(meta)deepStrictEqual(clean,meta);else meta=clean;
 for(const r of data.records){ok(!rows.has(r.key),'duplicate selected replay');rows.set(r.key,r);}
}
meta={...meta,manifestSHA256:sha(manifestText),manifest,newResearchExecutions:0};
// Preserve original runner property order: newResearchExecutions follows manifest.
delete meta.newResearchExecutions;meta.newResearchExecutions=0;
const fingerprint=sha(JSON.stringify(meta));
const store=new CooperativeStore({out:plan.master,meta,fingerprint,expectedCount:manifest.selected.length,key:r=>r.key,project:s=>s.records});
try{
 let n=0;
 for(const s of manifest.selected){const key=s.inputId+'/'+s.recordSHA256,r=rows.get(key);if(!r)break;if(n<store.records.length)deepStrictEqual(store.records[n],r);else store.append(r);n++;}
 strictEqual(n,store.records.length);
 store.checkpoint({...meta,fingerprint,executions:n,expectedReplays:manifest.selected.length,complete:n===manifest.selected.length,records:store.records});
 console.log(JSON.stringify({merged:n,uniqueStaged:rows.size,expected:manifest.selected.length,complete:n===manifest.selected.length,newResearchExecutions:0}));
}finally{store.close();}
