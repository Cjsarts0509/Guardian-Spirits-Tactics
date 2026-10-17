import copy,gzip,importlib.util,json,pathlib,sys,unittest
spec=importlib.util.spec_from_file_location('stage',pathlib.Path(__file__).with_name('commander-stage-analysis.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
source=json.loads(gzip.decompress(pathlib.Path(sys.argv.pop(1)).read_bytes()));verified=json.loads(pathlib.Path(sys.argv.pop(1)).read_bytes())
class StageTests(unittest.TestCase):
 def test_full_valid_and_repeated(self):self.assertEqual(m.analyze(source,verified),m.analyze(source,verified))
 def test_tick_order_before(self):
  first={'at':100,'attacker':'b'};positions={'a':0,'b':1,'c':2}
  self.assertEqual(m.phase(100,'a',first,positions,True),'before_first_ground_death');self.assertEqual(m.phase(100,'b',first,positions,True),'before_first_ground_death')
 def test_tick_order_after(self):self.assertEqual(m.phase(100,'c',{'at':100,'attacker':'b'},{'a':0,'b':1,'c':2},True),'after_first_ground_death')
 def test_unknown_timing_not_interpolated(self):
  x=copy.deepcopy(next(x for x in source['records'] if m.game_row(x)['firstGroundDeath'] is not None and x['variant']=='reportedSupreme'))
  first=m.game_row(x)['firstGroundDeath'];a=next(a for a in x['result']['actions'] if a['player']==first['attacker'] and a['at']==first['at'] and a['action'].get('target')==first['target']);a['receiptKinds']=[k for k in a['receiptKinds'] if k!='attack.kill']
  row=m.game_row(x);self.assertFalse(row['completeGroundDeathTiming']);self.assertIsNone(row['firstGroundDeath']);self.assertTrue(row['missingGroundDeaths']);self.assertEqual(row['stages']['before_first_ground_death'],{});self.assertEqual(row['stages']['after_first_ground_death'],{})
 def test_terminal_contradiction_rejected(self):
  x=copy.deepcopy(next(x for x in source['records'] if x['result']['game']['winner']==1))
  for p in x['result']['game']['survivors']:
   if p['character'] in m.GROUND:p['alive']=False
  with self.assertRaises(AssertionError):m.game_row(x)
 def test_kill_identity_contradiction_rejected(self):
  x=copy.deepcopy(next(x for x in source['records'] if m.game_row(x)['directCommanderKills']));first=m.game_row(x)['directCommanderKills'][0]
  next(a for a in x['result']['actions'] if a['player']==first['attacker'] and a['at']==first['at'] and a['action'].get('target')==first['target'])['action']['name']='wrong_name'
  with self.assertRaises(AssertionError):m.game_row(x)
 def test_missing_game_rejected(self):
  d=copy.deepcopy(source);d['records'].pop()
  with self.assertRaises(AssertionError):m.analyze(d,verified)
 def test_friendly_report_not_enemy_target(self):
  x=copy.deepcopy(next(x for x in source['records'] if any(q['side']==1 and any(t['name'] in m.GROUND for t in q['targets']) for q in x['result'].get('supremeDecisions',[]))))
  a=m.game_row(x);q=next(q for q in x['result']['supremeDecisions'] if q['side']==1 and any(t['name'] in m.GROUND for t in q['targets']));q['targets']=[t for t in q['targets'] if t['name'] not in m.GROUND];b=m.game_row(x)
  enemy=lambda r:{name:{k:v for k,v in counts.items() if k.startswith('enemyGroundCommanderReportTarget:')} for name,counts in r['stages'].items()}
  self.assertEqual(enemy(a),enemy(b))
 def test_missing_choice_census_rejected(self):
  d=copy.deepcopy(source);x=next(x for x in d['records'] if x['variant']=='reportedSupreme');x['result']['supremeDecisions'].pop()
  with self.assertRaises(AssertionError):m.analyze(d,verified)
if __name__=='__main__':unittest.main()
