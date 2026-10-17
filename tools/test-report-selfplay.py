"""Rehash all storage layers: reject semantic tampering, not only bad checksums."""
import copy,hashlib,importlib.util,json,pathlib,sys,tempfile,unittest
spec=importlib.util.spec_from_file_location('report_verify',pathlib.Path(__file__).with_name('verify-report-selfplay.py'));v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
source=json.loads(pathlib.Path(sys.argv.pop(1)).read_text())
class ContentChecks(unittest.TestCase):
 def check_data(self,d,valid=False):
  with tempfile.TemporaryDirectory(prefix='gst045-tamper-') as td:
   p=pathlib.Path(td)/'sample.json';j=p.with_suffix('.journal.ndjson')
   meta={k:x for k,x in d.items() if k not in ['fingerprint','complete','executions','journalSha256','records']}
   d['fingerprint']=v.sha(v.encoded(meta))
   journal=b'\n'.join([v.encoded(dict(type='header',fingerprint=d['fingerprint'],meta=meta))]+[v.encoded(r) for r in d['records']])+b'\n'
   d['journalSha256']=v.sha(journal);raw=v.encoded(d);p.write_bytes(raw);j.write_bytes(journal)
   p.with_suffix('.publication.json').write_bytes(v.encoded(dict(version=2,fingerprint=d['fingerprint'],executions=d['executions'],complete=d['complete'],snapshotSHA256=v.sha(raw),journalSHA256=v.sha(journal))))
   if valid:v.verify(p,j)
   else:
    with self.assertRaises(AssertionError):v.verify(p,j)
 def candidate(self,d):
  return next((r,t) for x in d['records'] if x['variant']=='reportedSupreme' for r in [x['result']] for t in r['supremeDecisions'] if t['selected'])
 def test_valid(self):self.check_data(copy.deepcopy(source),True)
 def test_wrong_identity(self):
  d=copy.deepcopy(source);_,t=self.candidate(d);t['receipt']['actualName']='wrong_name';self.check_data(d)
 def test_eligible_hidden(self):
  d=copy.deepcopy(source);_,t=self.candidate(d);t['knowledgeUnchanged']=False;self.check_data(d)
 def test_false_success(self):
  d=copy.deepcopy(source);r,t=self.candidate(d);a=next(a for a in r['actions'] if a['player']==t['player'] and a['at']==t['at'] and a['action']==t['chosenAction']);a['receiptKinds']=[];self.check_data(d)
 def test_resource_mismatch(self):
  d=copy.deepcopy(source);d['records'][0]['result']['resources']['acceptedSkillMana']+=50;self.check_data(d)
 def test_profile_mismatch(self):
  d=copy.deepcopy(source);d['options']['cooperative']={'reportedSupreme':True};d['optionsSHA256']=v.sha(v.encoded(d['options']));self.check_data(d)
 def test_past_failure_eligible(self):
  d=copy.deepcopy(source);_,t=self.candidate(d);next(z for z in t['targets'] if z['id']==t['suggestion']['target'])['ownSameNameFailure']=True;self.check_data(d)
 def test_missing_idle_census(self):
  d=copy.deepcopy(source);r,_=self.candidate(d);del r['supremeDecisions'][0];self.check_data(d)
if __name__=='__main__':unittest.main()
