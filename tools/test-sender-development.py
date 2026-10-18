import copy,importlib.util,json,pathlib,sys,unittest
spec=importlib.util.spec_from_file_location('v',pathlib.Path(__file__).with_name('verify-sender-development.py'));v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
d=json.loads(v.read(sys.argv.pop(1)));v.RULES=d['publicRules'];records=d['records']
class Checks(unittest.TestCase):
 def reject(self,change,predicate=lambda r:True):
  r=copy.deepcopy(next(r for r in records if predicate(r)));change(r)
  with self.assertRaises(AssertionError):v.validate_record(r)
 def test_valid(self):
  for r in records:v.validate_record(r)
 def test_false_mana(self):self.reject(lambda r:r['resources'].update(nominalSkillMana=99999))
 def test_false_winner_policy(self):self.reject(lambda r:r['game'].update(winnerPolicy='bad'))
 def test_false_receipt(self):self.reject(lambda r:r['actions'][0].update(accepted=not r['actions'][0]['accepted']),lambda r:r['actions'])
 def test_false_actor(self):self.reject(lambda r:r['actions'][0].update(character='fake'),lambda r:r['actions'])
 def test_false_counter(self):self.reject(lambda r:r['counters'].update(selected=999))
 def test_hidden_view(self):
  if any(r['decisions'] for r in records):self.reject(lambda r:r['decisions'][0]['view']['players'][0].update(mana=999),lambda r:r['decisions'])
 def test_private_other(self):
  if any(r['decisions'] for r in records):self.reject(lambda r:r['decisions'][0]['events'].append(dict(seq=999999,at=0,vis=dict(to='players',ids=['not-owner']))),lambda r:r['decisions'])
 def test_false_reserve(self):
  if any(r['decisions'] for r in records):self.reject(lambda r:r['decisions'][0]['diagnostic'].update(reserve=999),lambda r:r['decisions'])
 def test_false_changed(self):
  if any(r['decisions'] for r in records):self.reject(lambda r:r['decisions'][0].update(changed=not r['decisions'][0]['changed']),lambda r:r['decisions'])
 def test_false_report_memory(self):
  if any(r['decisions'] for r in records):self.reject(lambda r:r['decisions'][0]['intel']['reports'].append(['fake',[]]),lambda r:r['decisions'])
 def test_missing_confirming_gem_receipt(self):
  predicate=lambda r:any(d['selected'] and d['receipt']['accepted'] and d['chosenAction']['skill']=='truth_gem' and d['chosenAction']['target'] in dict(d['receipt']['knownAfter']) for d in r['decisions'])
  if any(predicate(r) for r in records):
   def change(r):
    d=next(d for d in r['decisions'] if d['selected'] and d['receipt']['accepted'] and d['chosenAction']['skill']=='truth_gem' and d['chosenAction']['target'] in dict(d['receipt']['knownAfter']));d['receipt']['ownEvents']=[]
   self.reject(change,predicate)
 def test_false_episode(self):self.reject(lambda r:r['episodes'].append(dict(decision=-999)))
if __name__=='__main__':unittest.main()
