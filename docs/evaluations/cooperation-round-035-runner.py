import subprocess,json,pathlib,hashlib,datetime
root=pathlib.Path('/workspace/scratch/dda69bfb36e1/Guardian-Spirits-Tactics');out=pathlib.Path('/tmp/gst-round035-selfplay.json');ref='7a05fcf8be4017ac51f2bdebbd8437153dd7ec98';events=[]
for i in range(8):
 r=subprocess.run(['node','--import','./packages/rules/node_modules/tsx/dist/loader.mjs','packages/rules/scripts/selfplay-balance-run.ts','16','146000',str(out),'48'],cwd=root,capture_output=True,text=True);assert r.returncode==0,r.stderr
 v=subprocess.run(['python','tools/verify-selfplay-balance.py',str(out),'--source-ref',ref,'--journal-path',str(out.with_suffix('.journal.ndjson')),'--allow-partial'],cwd=root,capture_output=True,text=True);assert v.returncode==0,v.stderr
 d=json.loads(v.stdout);assert d['executions']==(i+1)*48;out.with_suffix('.verified.json').write_text(v.stdout)
 e={'batch':i+1,'executions':d['executions'],'complete':d['complete'],'sourceRef':ref,'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'snapshotSHA256':hashlib.sha256(out.read_bytes()).hexdigest()};events.append(e);out.with_suffix('.batches.json').write_text(json.dumps(events,indent=2));print(json.dumps(e),flush=True)
assert d['complete']
