import copy,importlib.util,pathlib,unittest
p=pathlib.Path(__file__).with_name('analyze-guardian-own-choices.py');spec=importlib.util.spec_from_file_location('choices',p);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def view():
 return {'phase':'running','me':{'id':'g','character':'consume','side':2,'alive':True,'mana':50,'skills':[{'key':'consume_master_guard','passive':False,'blocked':None,'cooldownRemainingMs':0,'usesLeft':1,'mana':50,'ignoresInvulnerable':False}]},'roster':[{'key':'eltas','commander':True,'side':2}],'players':[{'id':'g','alive':True,'statuses':[]},{'id':'t','alive':True,'statuses':[],'published':'eltas'}]}
class Checks(unittest.TestCase):
 def test_claim_is_not_knowledge(self):self.assertEqual(m.classify(view(),[],None)['reason'],'commander_unknown')
 def test_own_known_proposal_is_not_full_legal_opportunity(self):
  c=m.classify(view(),[['t','eltas']],{'type':'skill','skill':'consume_master_guard','target':'t'});self.assertTrue(c['selectedProposal']);self.assertFalse(c['fullLegalOpportunityProven'])
 def test_resources_and_cooldown(self):
  for field,value in [('mana',49),('cooldownRemainingMs',1),('usesLeft',0),('blocked','사용불가')]:
   v=view()
   if field=='mana':v['me']['mana']=value
   else:v['me']['skills'][0][field]=value
   self.assertEqual(m.classify(v,[['t','eltas']],None)['reason'],'guard_unavailable')
 def test_dead_and_invulnerable_target(self):
  v=view();v['players'][1]['alive']=False;self.assertEqual(m.classify(v,[['t','eltas']],None)['reason'],'commander_dead')
  v=view();v['players'][1]['statuses']=[{'kind':'invulnerable'}];self.assertEqual(m.classify(v,[['t','eltas']],None)['reason'],'known_target_invulnerable')
 def test_same_tick_before_and_after_lethal_action(self):
  b={'kind':'action','at':10,'actionIndex':3};self.assertTrue(m.before_boundary({'at':10,'ordinal':3},b));self.assertFalse(m.before_boundary({'at':10,'ordinal':4},b));self.assertTrue(m.before_boundary({'at':9,'ordinal':3},b))
 def test_same_tick_due_death_precedes_choices(self):self.assertFalse(m.before_boundary({'at':10,'ordinal':0},{'kind':'advance','at':10,'actionIndex':None}))
 def test_other_action_not_counted_as_selected_guard(self):self.assertFalse(m.classify(view(),[['t','eltas']],{'type':'skill','skill':'ally','target':'t'})['selectedProposal'])
 def test_unrelated_public_claim_changes_do_not_promote_knowledge(self):
  a=view();b=copy.deepcopy(a);b['players'][1]['published']='rael';self.assertEqual(m.classify(a,[],None),m.classify(b,[],None))
if __name__=='__main__':unittest.main()
