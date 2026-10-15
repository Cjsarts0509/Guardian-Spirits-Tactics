"""Semantic tampering must fail even when the replay-success flags remain true."""
import copy,gzip,json,pathlib,subprocess,sys,tempfile
source,audit=map(pathlib.Path,sys.argv[1:3]);b=audit.read_bytes();d=json.loads(gzip.decompress(b) if audit.suffix=='.gz' else b);results=[]
for kind in ['ready_without_skill','wrong_identity','receipt_digest','missing_selected_decision']:
 changed=copy.deepcopy(d)
 if kind=='ready_without_skill':
  q=next(q for r in changed['records'] for q in r['decisions'] if any(t['status']=='ready' for t in q['targets']));q['skills']=[]
 elif kind=='wrong_identity':
  q=next(q for r in changed['records'] for q in r['decisions'] if any(t['id'] for t in q['targets']));next(t for t in q['targets'] if t['id'])['id']=q['player']
 elif kind=='receipt_digest':changed['records'][0]['actionSHA256']='0'*64
 else:
  r=changed['records'][0];i=next(i for i,q in enumerate(r['decisions']) if q['action']);del r['decisions'][i]
 with tempfile.TemporaryDirectory(prefix='gst041-tamper-') as td:
  path=pathlib.Path(td)/'audit.json';path.write_text(json.dumps(changed))
  run=subprocess.run([sys.executable,'tools/verify-commander-opportunities.py',str(source),str(path)],capture_output=True,text=True)
  assert run.returncode!=0 and 'AssertionError' in run.stderr,(kind,run.stderr)
  results.append(dict(case=kind,rejected=True))
print(json.dumps(dict(tests=len(results),results=results),indent=2))
