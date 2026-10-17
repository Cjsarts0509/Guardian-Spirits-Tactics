"""Finite same-policy batches; verified output only, lease checked before each batch."""
import argparse,datetime,hashlib,importlib.util,json,pathlib,subprocess,sys
spec=importlib.util.spec_from_file_location('verify_guard',pathlib.Path(__file__).with_name('verify-guard-selfplay.py'));verify=importlib.util.module_from_spec(spec);spec.loader.exec_module(verify)
p=argparse.ArgumentParser();p.add_argument('count',type=int);p.add_argument('start',type=int);p.add_argument('out',type=pathlib.Path);p.add_argument('batches',type=int)
p.add_argument('--source-ref',required=True);p.add_argument('--lease-until',required=True);a=p.parse_args()
assert a.count>0 and a.start>=0 and 0<a.batches<=20 and a.out.suffix=='.json'
lease=datetime.datetime.fromisoformat(a.lease_until);assert lease.tzinfo
source=subprocess.check_output(['git','rev-parse',a.source_ref],text=True).strip()
paths=['packages/rules/src','packages/rules/scripts','tools/verify-guard-selfplay.py','tools/run-guard-selfplay.py']
subprocess.run(['git','diff','--exit-code',source,'--',*paths],check=True,capture_output=True)
base=str(a.out).removesuffix('.json');journal=pathlib.Path(base+'.journal.ndjson');pub=pathlib.Path(base+'.publication.json');log=pathlib.Path(base+'.batches.ndjson')
def hashes():
    return {str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in [a.out,journal,pub] if p.exists()}
before=hashes();fresh=0
for i in range(a.batches):
    if datetime.datetime.now(datetime.timezone.utc)>=lease:raise RuntimeError('lease expired before next batch')
    cmd=['node','--import','./packages/rules/node_modules/tsx/dist/loader.mjs','packages/rules/scripts/guard-selfplay-run.ts',str(a.count),str(a.start),str(a.out),'40']
    run=subprocess.run(cmd,capture_output=True,text=True)
    if run.returncode:
        with log.open('a') as f:f.write(json.dumps(dict(batch=i,exitCode=run.returncode,stdout=run.stdout,stderr=run.stderr))+'\n')
        raise RuntimeError(run.stderr)
    status=json.loads(run.stdout.strip().splitlines()[-1]);fresh+=status['fresh']
    result=verify.verify(a.out,journal,source,partial=not status['complete'])
    assert result['executions']==status['total'] and result['complete']==status['complete']
    event=dict(at=datetime.datetime.now(datetime.timezone.utc).isoformat(),sourceRef=source,command=cmd,**status,snapshotSHA256=result['snapshotSHA256'],journalSHA256=result['journalSHA256'])
    with log.open('a') as f:f.write(json.dumps(event)+'\n')
    print(json.dumps(event),flush=True)
    pathlib.Path(base+'.verified.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    if status['complete']:break
resume=dict(sourceRef=source,newGames=fresh,complete=status['complete'],executions=status['total'],before=before,after=hashes(),unchanged=before==hashes())
pathlib.Path(base+'.resume.json').write_text(json.dumps(resume,indent=2)+'\n')
print(json.dumps(resume),flush=True)
