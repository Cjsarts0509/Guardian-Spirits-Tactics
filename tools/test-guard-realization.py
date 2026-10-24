"""Reject corrupted observations even if the claimed replay success remains true."""
import copy,json,pathlib,subprocess,sys,tempfile
source,audit=map(pathlib.Path,sys.argv[1:3]);d=json.loads(audit.read_text());results=[]
for kind in ['charge','receipt_digest','missing_guardian']:
 changed=copy.deepcopy(d)
 if kind=='charge':
  r=next(r for r in changed['records'] if any(t['after'] and any(q['charges'] for q in t['after']) for t in r['transitions']))
  t=next(t for t in r['transitions'] if any(q['charges'] for q in t['after']));next(q for q in t['after'] if q['charges'])['charges']=9
 elif kind=='receipt_digest':changed['records'][0]['actionSHA256']='0'*64
 else:
  r=next(r for r in changed['records'] if r['finalGuardians']);r['finalGuardians']=[]
 with tempfile.TemporaryDirectory(prefix='gst040-tamper-') as td:
  path=pathlib.Path(td)/'audit.json';path.write_text(json.dumps(changed))
  run=subprocess.run([sys.executable,'tools/verify-guard-realization.py',str(source),str(path)],capture_output=True,text=True)
  assert run.returncode!=0 and 'AssertionError' in run.stderr,(kind,run.stderr)
  results.append(dict(case=kind,rejected=True))
print(json.dumps(dict(tests=len(results),results=results),indent=2))
