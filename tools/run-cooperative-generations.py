"""Bounded fresh-path batches. Native flock releases on process death; old writer locks are never stolen."""
import argparse,datetime,fcntl,hashlib,json,os,pathlib,re,subprocess,sys,tempfile,uuid
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser();p.add_argument('count',type=int);p.add_argument('start',type=int);p.add_argument('out',type=pathlib.Path);p.add_argument('batches',type=int);p.add_argument('--source-ref');p.add_argument('--unit-current-source',action='store_true');p.add_argument('--candidate',default='netAttackReserve');p.add_argument('--lease-until');p.add_argument('--phase',choices=['development','holdout'],default='development');a=p.parse_args()
assert a.count>0 and a.start>=0 and a.batches>0 and a.out.suffix=='.json'
assert bool(a.source_ref)!=a.unit_current_source
if a.unit_current_source:assert a.count==1 and a.start in [23,24,25] and a.phase=='development'
else:assert re.fullmatch('[0-9a-f]{40}',a.source_ref)
out=a.out.resolve();out.parent.mkdir(parents=True,exist_ok=True)
lock=open(str(out)+'.run.lock','a+')
try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
except BlockingIOError:raise SystemExit('Another generation supervisor is running; no collector started')
if pathlib.Path(str(out)+'.store').exists():raise SystemExit('Existing canonical cache/writer is preserved. Use a fresh export path.')
root=pathlib.Path(str(out)+'.generations');root.mkdir(exist_ok=True)
hash=lambda b:hashlib.sha256(b).hexdigest()
def paths(base):return [base,base.with_suffix('.journal.ndjson'),base.with_suffix('.publication.json')]
def verify(base):
 cmd=[sys.executable,'tools/verify-claim-commitment.py',str(base),'--journal-path',str(base.with_suffix('.journal.ndjson'))]
 if not json.loads(base.read_bytes())['complete']:cmd+=['--allow-partial']
 if a.source_ref:cmd+=['--source-ref',a.source_ref]
 return json.loads(subprocess.check_output(cmd,cwd=ROOT))
def exports(base,summary):
 blobs=[x.read_bytes() for x in paths(base)];snapshot=json.loads(blobs[0]);pub=json.loads(blobs[2]);assert summary['publicationVerified'] and snapshot['executions']==summary['executions']
 assert pub['snapshotSHA256']==hash(blobs[0]) and pub['journalSHA256']==hash(blobs[1]) and pub['executions']==summary['executions']
 return blobs
def publish(base,blobs):
 for target,raw in zip(paths(base),blobs):
  tmp=pathlib.Path(str(target)+'.'+str(uuid.uuid4())+'.tmp')
  with open(tmp,'xb') as f:f.write(raw);f.flush();os.fsync(f.fileno())
  assert tmp.read_bytes()==raw;os.replace(tmp,target)
 fd=os.open(base.parent,os.O_RDONLY)
 try:os.fsync(fd)
 finally:os.close(fd)
 assert [p.read_bytes() for p in paths(base)]==blobs
def write_summary(base,summary):
 raw=(json.dumps(summary,ensure_ascii=False,indent=2)+'\n').encode();target=base.with_suffix('.verified.json');tmp=pathlib.Path(str(target)+'.'+str(uuid.uuid4())+'.tmp')
 if summary['complete']:
  assert {'contrasts','developmentGatePassed','holdoutGatePassed'}<=summary.keys()
  assert len(summary['contrasts'])==2
 with open(tmp,'xb') as f:f.write(raw);f.flush();os.fsync(f.fileno())
 assert tmp.read_bytes()==raw;os.replace(tmp,target)
 fd=os.open(target.parent,os.O_RDONLY)
 try:os.fsync(fd)
 finally:os.close(fd)
 assert target.read_bytes()==raw
previous=verify(out) if out.exists() else None
recovered=False
# Completed generation exports must not disappear when a parent dies before publishing stable output.
for folder in root.glob('batch-*'):
 gen=folder/'data.json';cache=folder/'data.json.store'/'records'
 if not gen.exists():
  if cache.exists() and any(cache.glob('*.json')):raise SystemExit('Unpublished canonical games require explicit recovery; no collector started')
  continue
 snapshot=json.loads(gen.read_bytes())
 if cache.exists() and len(list(cache.glob('*.json')))!=snapshot['executions']:raise SystemExit('Canonical games exceed/mismatch exported checkpoint; recover before resuming')
 if previous and snapshot['executions']<=previous['executions']:continue
 candidate_summary=verify(gen)
 assert snapshot['start']==a.start and snapshot['count']==a.count and snapshot['phase']==a.phase and snapshot['variants'][-1]==a.candidate
 if previous:
  assert candidate_summary['fingerprint']==previous['fingerprint']
  assert snapshot['records'][:previous['executions']]==json.loads(out.read_bytes())['records']
 publish(out,exports(gen,candidate_summary));previous=candidate_summary;recovered=True
if recovered:
 event={'kind':'recovered_unpublished_export','sourceRef':a.source_ref,'executions':previous['executions'],'newGames':0,'publicationVerified':True}
 with open(out.with_suffix('.batches.ndjson'),'a') as f:f.write(json.dumps(event)+'\n');f.flush();os.fsync(f.fileno())
if previous and previous['complete']:
 write_summary(out,previous)
 print(json.dumps({'executions':previous['executions'],'newGames':0,'complete':True,'publicationVerified':True,'recoveredExport':recovered}));sys.exit(0)
for batch in range(a.batches):
 if a.lease_until and datetime.datetime.now(datetime.timezone.utc)>=datetime.datetime.fromisoformat(a.lease_until)-datetime.timedelta(seconds=300):break
 before=previous['executions'] if previous else 0
 gen=pathlib.Path(tempfile.mkdtemp(prefix='batch-',dir=root))/'data.json'
 if previous:publish(gen,exports(out,previous))
 cmd=['node','--import',str(ROOT/'packages/rules/node_modules/tsx/dist/loader.mjs'),str(ROOT/'packages/rules/scripts/cooperative-claim-commitment.ts'),str(a.count),str(a.start),str(gen),'96',a.phase,a.candidate]
 child=subprocess.run(cmd,cwd=ROOT,text=True,capture_output=True,timeout=240);sys.stderr.write(child.stderr)
 if child.returncode:raise SystemExit('Collector failed; preserving generation and prior verified export')
 current=verify(gen);new=min(96,a.count*4*3*4*3-before);assert current['executions']==before+new and int(re.findall(r'신규(\d+)',child.stderr)[-1])==new
 if previous:assert current['fingerprint']==previous['fingerprint']
 publish(out,exports(gen,current));assert verify(out)['executions']==current['executions']
 write_summary(out,current)
 event={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sourceRef':a.source_ref,'unitTest':a.unit_current_source,'driverSHA256':hash(pathlib.Path(__file__).read_bytes()),'executions':current['executions'],'newGames':new,'complete':current['complete'],'publicationVerified':True,'snapshotSHA256':hash(out.read_bytes())}
 with open(out.with_suffix('.batches.ndjson'),'a') as f:f.write(json.dumps(event)+'\n');f.flush();os.fsync(f.fileno())
 print(json.dumps(event),flush=True);previous=current
 if current['complete']:break
