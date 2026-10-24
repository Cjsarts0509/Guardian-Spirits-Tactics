"""Reject altered eligibility, factual promotion and counterfactual/actual action substitution."""
import copy,gzip,json,pathlib,subprocess,sys,tempfile
source,audit,reference=map(pathlib.Path,sys.argv[1:4]);b=audit.read_bytes();d=json.loads(gzip.decompress(b) if audit.suffix=='.gz' else b);results=[]
for kind in ['past_failure_still_eligible','wrong_on_target','fact_promotion','actual_digest','missing_null_choice']:
 changed=copy.deepcopy(d)
 if kind=='actual_digest':changed['records'][0]['actionSHA256']='0'*64
 elif kind=='missing_null_choice':
  r=next(r for r in changed['records'] if any(q['off'] is None for q in r['decisions']));i=next(i for i,q in enumerate(r['decisions']) if q['off'] is None);del r['decisions'][i]
 else:
  q=next(q for r in changed['records'] for q in r['decisions'] if q['changed'])
  if kind=='past_failure_still_eligible':next(t for t in q['targets'] if t['id']==q['on']['target'])['ownSameNameFailure']=True
  elif kind=='wrong_on_target':q['on']['target']=q['player']
  else:q['knowledgeUnchanged']=False
 with tempfile.TemporaryDirectory(prefix='gst043-tamper-') as td:
  path=pathlib.Path(td)/'audit.json';path.write_text(json.dumps(changed))
  run=subprocess.run([sys.executable,'tools/verify-reported-supreme-audit.py',str(source),str(path),str(reference)],capture_output=True,text=True)
  assert run.returncode!=0 and 'AssertionError' in run.stderr,(kind,run.stderr)
  results.append(dict(case=kind,rejected=True))
print(json.dumps(dict(tests=len(results),results=results),indent=2))
