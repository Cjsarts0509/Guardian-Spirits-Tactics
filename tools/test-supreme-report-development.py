"""Rehashed v2 journals must still reject changed own conditions/receipts/census."""
import copy,hashlib,json,pathlib,subprocess,sys,tempfile
source=pathlib.Path(sys.argv[1]);original=json.loads(source.read_bytes());results=[]
enc=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()
sha=lambda b:hashlib.sha256(b).hexdigest()
for case in ['valid','past_failure','fact_promotion','wrong_receipt','missing_idle']:
 d=copy.deepcopy(original)
 if case!='valid':
  rows=[q for r in d['records'] for q in r['result'].get('supremeDecisions',[])];q=next(q for q in rows if q['changed'])
  if case=='past_failure':next(z for z in q['targets'] if z['id']==q['suggestion']['target'])['ownSameNameFailure']=True
  elif case=='fact_promotion':q['knowledgeUnchanged']=False
  elif case=='wrong_receipt':q['receipt']['manaDelta']+=1
  else:
   r=next(r for r in d['records'] if any(q['chosenAction'] is None for q in r['result'].get('supremeDecisions',[])))
   i=next(i for i,q in enumerate(r['result']['supremeDecisions']) if q['chosenAction'] is None);del r['result']['supremeDecisions'][i]
 meta={k:v for k,v in d.items() if k not in ['fingerprint','complete','executions','journalSha256','records']}
 journal=enc({'type':'header','fingerprint':d['fingerprint'],'meta':meta})+b'\n'+b''.join(enc(r)+b'\n' for r in d['records']);d['journalSha256']=sha(journal);raw=enc(d)
 with tempfile.TemporaryDirectory(prefix='gst044-tamper-') as td:
  base=pathlib.Path(td)/'data';base.with_suffix('.json').write_bytes(raw);base.with_suffix('.journal.ndjson').write_bytes(journal)
  base.with_suffix('.publication.json').write_bytes(enc({'version':2,'fingerprint':d['fingerprint'],'executions':d['executions'],'complete':d['complete'],'snapshotSHA256':sha(raw),'journalSHA256':sha(journal)}))
  r=subprocess.run([sys.executable,'tools/verify-claim-commitment.py',str(base.with_suffix('.json')),'--journal-path',str(base.with_suffix('.journal.ndjson'))],text=True,capture_output=True)
  assert (r.returncode==0) if case=='valid' else (r.returncode!=0 and 'AssertionError' in r.stderr),(case,r.stderr)
  results.append({'case':case,'passed':True})
print(json.dumps({'tests':len(results),'results':results},indent=2))
