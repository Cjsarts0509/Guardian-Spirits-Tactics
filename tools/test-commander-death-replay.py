"""Reject semantically corrupted replay rows even when storage is rehashed."""
import copy,gzip,importlib.util,json,pathlib,sys,unittest
spec=importlib.util.spec_from_file_location('v',pathlib.Path(__file__).with_name('verify-commander-death-replay.py'));v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
snapshot=json.loads(v.read(sys.argv.pop(1)));original=json.loads(v.read(sys.argv.pop(1)))
class ReplayChecks(unittest.TestCase):
 def pair(self):
  i=next(i for i,r in enumerate(snapshot['records']) if r['deaths']);return copy.deepcopy(snapshot['records'][i]),original['records'][i]
 def reject(self,mutate):
  r,o=self.pair();mutate(r)
  with self.assertRaises(AssertionError):v.validate_row(r,o)
 def test_valid_all(self):
  for r,o in zip(snapshot['records'],original['records']):v.validate_row(r,o)
 def test_missing_death(self):self.reject(lambda r:r['deaths'].pop())
 def test_duplicate_death(self):self.reject(lambda r:r['deaths'].append(copy.deepcopy(r['deaths'][0])))
 def test_wrong_cause(self):self.reject(lambda r:r['deaths'][0].update(cause='invented'))
 def test_wrong_victim(self):self.reject(lambda r:r['deaths'][0].update(victim='hidden-other'))
 def test_missing_predeath_view(self):self.reject(lambda r:r['deaths'][0]['before'].update(ownDefense=None))
 def test_wrong_own_identity(self):self.reject(lambda r:r['deaths'][0]['before']['ownDefense'].update(character='hidden-other'))
 def test_receipt_count(self):self.reject(lambda r:r.update(receipts=r['receipts']-1))
 def test_trace_not_policy_input(self):self.reject(lambda r:r.update(policyResultSHA256='0'*64))
 def test_missing_boundary_trace(self):self.reject(lambda r:r.update(transitions=[]))
if __name__=='__main__':unittest.main()
