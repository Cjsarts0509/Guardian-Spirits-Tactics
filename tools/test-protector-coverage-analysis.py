import copy,importlib.util,json,pathlib,sys,unittest
spec=importlib.util.spec_from_file_location('coverage',pathlib.Path(__file__).with_name('protector-coverage-analysis.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
original=json.loads(m.v.read(sys.argv.pop(1)));trace=json.loads(m.v.read(sys.argv.pop(1)));verified=json.loads(pathlib.Path(sys.argv.pop(1)).read_text())
class CoverageChecks(unittest.TestCase):
 def test_full_valid_repeated(self):self.assertEqual(m.analyze(original,trace,verified),m.analyze(original,trace,verified))
 def test_missing_game(self):
  t=copy.deepcopy(trace);t['records'].pop()
  with self.assertRaises(AssertionError):m.analyze(original,t,verified)
 def test_missing_guard_assignment_not_ai_nonuse(self):
  d={'character':'eltas','before':{'externalProtection':None}};self.assertEqual(m.guard_status(d,{'eltas','rael','kane'})[0],'guardian_not_assigned')
 def test_dead_guard_not_ready(self):
  d={'character':'eltas','before':{'externalProtection':{'character':'consume','alive':False}}};self.assertEqual(m.guard_status(d,{'consume'})[0],'guardian_dead')
 def test_nominal_readiness_not_called_legal_opportunity(self):
  skill=dict(key='consume_master_guard',passive=False,blocked=None,usesLeft=1,cooldownRemainingMs=0,mana=50)
  d={'character':'eltas','before':{'externalProtection':dict(character='consume',alive=True,bodyguard=False,charges=0,guardianOwnView=dict(alive=True,mana=50,skills=[skill]))}}
  self.assertEqual(m.guard_status(d,{'consume'})[0],'unactivated_nominally_ready');skill['usesLeft']=0;self.assertEqual(m.guard_status(d,{'consume'})[0],'unactivated_unavailable')
 def test_guarded_charge_cannot_remain_unchanged(self):
  t=copy.deepcopy(trace)
  pair=next((r,x,e) for r in t['records'] for x in r['transitions'] for e in x['events'] if e['kind']=='attack.guarded' and e.get('data',{}).get('target') in m.v.COMMANDERS)
  r,x,e=pair;c=e['data']['target'];p=next(p for p in x['before'] if p['character']==c);q=next(p for p in x['after'] if p['character']==c);q['externalProtection']['charges']=p['externalProtection']['charges']
  with self.assertRaises(AssertionError):m.analyze(original,t,verified)
 def test_hit_extra_life_cannot_remain_unchanged(self):
  t=copy.deepcopy(trace);r,x,e=next((r,x,e) for r in t['records'] for x in r['transitions'] for e in x['events'] if e['kind']=='attack.hit' and e.get('data',{}).get('target') in m.v.COMMANDERS)
  c=e['data']['target'];p=next(p for p in x['before'] if p['character']==c);q=next(p for p in x['after'] if p['character']==c);q['extraLives']=p['extraLives']
  with self.assertRaises(AssertionError):m.analyze(original,t,verified)
 def test_winner_census_mismatch(self):
  t=copy.deepcopy(trace);t['records'][0]['winner']=3
  with self.assertRaises(AssertionError):m.analyze(original,t,verified)
 def test_actual_assignment_counts_are_not_nonuse(self):
  a=m.analyze(original,trace,verified)
  for s in a['summary']:
   if s['count']==0 or s['character']=='kane':continue
   expected=32 if s['count'] in ([12] if s['character']=='eltas' else [11,12]) else 0
   self.assertEqual(s['counts']['guardianAssigned'],expected)
 def test_real_named_absorption_and_bypass_are_distinct(self):
  a=m.analyze(original,trace,verified);s=next(s for s in a['summary'] if s['variant']=='reportedSupreme' and s['count']==0 and s['character']=='eltas')
  self.assertGreater(s['counts']['named:attack.guarded'],0);self.assertGreater(s['counts']['chargedGuardDeathCause:wolfs_slash'],0)
if __name__=='__main__':unittest.main()
