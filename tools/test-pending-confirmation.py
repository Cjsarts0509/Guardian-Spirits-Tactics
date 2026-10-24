"""Synthetic057 temporal/ownership boundaries, excluded from research counts."""
import copy,runpy,unittest
v=runpy.run_path('tools/verify-pending-confirmation.py');waiting=v['waiting'];ledger=v['ledger']
def event(kind,seq,at,target='p2',ids=None):return dict(kind=kind,seq=seq,at=at,data=dict(target=target),vis=dict(to='players',ids=ids or ['p1']))
def action(at=1000,player='p1',side=2,skill='chaos_hex',target='p2',accepted=True):return dict(at=at,player=player,side=side,action=dict(type='skill',skill=skill,target=target),accepted=accepted,beforeMana=100,afterMana=60)
class Boundaries(unittest.TestCase):
 def setUp(self):self.cast=event('skill.chaos_hex.self',10,1000)
 def test_due(self):self.assertEqual(len(waiting([self.cast],'p1',60999)),1);self.assertEqual(waiting([self.cast],'p1',61000),[])
 def test_own(self):self.assertEqual(waiting([self.cast],'p3',2000),[]);self.assertEqual(waiting([{**self.cast,'vis':{'to':'all'}}],'p1',2000),[])
 def test_result(self):self.assertEqual(waiting([self.cast,event('skill.chaos_hex.result',11,2000)],'p1',3000),[])
 def test_wrong_result(self):
  for e in [event('skill.chaos_hex.result',9,1000),event('skill.chaos_hex.result',11,4000),event('skill.chaos_hex.result',11,2000,'p3'),event('skill.chaos_hex.result',11,2000,ids=['p3'])]:self.assertEqual(len(waiting([self.cast,e],'p1',3000)),1)
 def test_no_foreknowledge(self):self.assertEqual(waiting([self.cast],'p1',999),[])
 def test_actual_order(self):
  r=dict(fixture={'currentSide':2},actions=[action(skill='troll_enemy_scan'),action(),action(skill='troll_enemy_scan')]);q,x=ledger(r);self.assertEqual(len(q),1);self.assertEqual([e['ordinal'] for e in x],[2])
 def test_due_and_target(self):
  r=dict(fixture={'currentSide':2},actions=[action(),action(at=2000,skill='troll_enemy_scan',player='p3'),action(at=2000,skill='troll_enemy_scan',target='p3'),action(at=61000,skill='troll_enemy_scan')]);self.assertEqual(ledger(r)[1],[])
 def test_rejected_or_other_side(self):
  for a in [action(accepted=False),action(side=1)]:self.assertEqual(ledger(dict(fixture={'currentSide':2},actions=[a,action(at=2000,skill='troll_enemy_scan')])) ,([],[]))
unittest.main()
