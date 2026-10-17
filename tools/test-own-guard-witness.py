import copy,importlib.util,json,pathlib,sys,unittest
spec=importlib.util.spec_from_file_location('v',pathlib.Path(__file__).with_name('verify-own-guard-witness.py'));v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
d=json.loads(v.read(sys.argv.pop(1)));o=json.loads(v.read(sys.argv.pop(1)))
def key(r):
 f=r.get('fixture') or r['result']['game']['fixture'];return r['variant'],f['seed'],f['reversed']
originals={key(r):r for r in o['records']};pairs=[(r,originals[key(r)]) for r in d['records']]
class OwnChecks(unittest.TestCase):
 def pair(self):return copy.deepcopy(pairs[0][0]),pairs[0][1]
 def reject(self,change):
  r,x=self.pair();change(r)
  with self.assertRaises(AssertionError):v.validate_row(r,x)
 def test_valid(self):
  for r,x in pairs:v.validate_row(r,x)
 def test_other_private_event(self):self.reject(lambda r:r['decisions'][0]['events'].append(dict(vis=dict(to='players',ids=['not-owner']))))
 def test_other_hidden_mana(self):self.reject(lambda r:r['decisions'][0]['view']['players'][0].update(mana=150))
 def test_wrong_owner(self):self.reject(lambda r:r['decisions'][0].update(player='not-owner'))
 def test_false_ready(self):self.reject(lambda r:next(d for d in r['decisions'] if d['diagnostic']['reason']!='own_guard_ready')['diagnostic'].update(reason='own_guard_ready'))
 def test_changed_receipts(self):self.reject(lambda r:r.update(actionsSHA256='0'*64))
 def test_missing_active(self):self.reject(lambda r:r['decisions'].pop())
 def test_false_selected(self):self.reject(lambda r:r['decisions'][0].update(selected=not r['decisions'][0]['selected']))
if __name__=='__main__':unittest.main()
