import copy,importlib.util,json,pathlib,sys,unittest
spec=importlib.util.spec_from_file_location('v',pathlib.Path(__file__).with_name('verify-incoming-sender-witness.py'));v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
d=json.loads(v.read(sys.argv.pop(1)));o=json.loads(v.read(sys.argv.pop(1)))
def key(r):
 f=r.get('fixture') or r['result']['game']['fixture'];return r['variant'],f['seed'],f['reversed']
originals={key(r):r for r in o['records']};pairs=[(r,originals[key(r)]) for r in d['records']]
class PreactionChecks(unittest.TestCase):
 def pair(self):return copy.deepcopy(pairs[0][0]),pairs[0][1]
 def reject(self,change):
  r,x=self.pair();change(r)
  with self.assertRaises(AssertionError):v.validate_row(r,x)
 def test_valid(self):
  for r,x in pairs:v.validate_row(r,x)
 def test_other_private_event(self):self.reject(lambda r:r['decisions'][0]['events'].append(dict(seq=999999,at=0,kind='private',vis=dict(to='players',ids=['not-owner']))))
 def test_other_hidden_mana(self):self.reject(lambda r:r['decisions'][0]['view']['players'][0].update(mana=150))
 def test_wrong_owner(self):self.reject(lambda r:r['decisions'][0].update(player='not-owner'))
 def test_false_reserve(self):self.reject(lambda r:r['decisions'][0]['diagnostic'].update(reserve=999))
 def test_false_incoming(self):self.reject(lambda r:r['decisions'][0]['diagnostic']['incoming'].append('not-known'))
 def test_changed_receipts(self):self.reject(lambda r:r.update(actionsSHA256='0'*64))
 def test_missing_active(self):self.reject(lambda r:r['decisions'].pop())
 def test_false_changed(self):self.reject(lambda r:r['decisions'][0].update(changed=not r['decisions'][0]['changed']))
 def test_fabricated_sent_memory(self):self.reject(lambda r:r['decisions'][0]['intel']['sent'].append(['fake',[['target','rael']]]))
 def test_after_action_mana_falsely_used_before(self):self.reject(lambda r:r['decisions'][0]['view']['me'].update(mana=999))
 def test_false_candidate_mass(self):self.reject(lambda r:r['decisions'][0]['diagnostic']['probabilities'][0][1][0].__setitem__(1,0.3))
 def test_false_baseline_memory_check(self):self.reject(lambda r:r['decisions'][0].update(actualMemoryMatchesBaseline=False))
 def test_fabricated_probe(self):self.reject(lambda r:r['decisions'][0].update(probe=dict(accepted=True)))
if __name__=='__main__':unittest.main()
