import copy,importlib.util,pathlib,unittest
p=pathlib.Path(__file__).with_name('analyze-guardian-stored-reports.py');s=importlib.util.spec_from_file_location('reports',p);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
def fixture():
 report={'character':'eltas','at':10,'seq':2};memory={'perception':{'intel':{'reports':{'$gstMap':[['t',{'$gstMap':[['s',report]]}]]}}}}
 d={'actor':'g','at':20,'knowledgeScope':'current-policy-own-update','reconstructedKnownAfter':[],'view':{'me':{'side':2},'roster':[{'key':'eltas','side':2},{'key':'kilder','side':2}]},'postMemory':{'$gstMap':[['g',memory]]}}
 a={'accepted':True,'player':'s','at':10,'reportTarget':'t','reportedName':'eltas','action':{'type':'chat','channel':'whisper','to':'g'}};return d,a
class Checks(unittest.TestCase):
 def test_repeated_memory_observation_is_one_report(self):
  d,a=fixture();r=m.census([d,d],[a],'g','eltas');self.assertEqual(r['counts']['uniqueObservedStoredCommanderReports'],1);self.assertEqual(r['counts']['ownPrimaryCalls'],2)
 def test_unknown_sender_is_not_trust(self):
  d,a=fixture();r=m.census([d],[a],'g','eltas');self.assertEqual(r['counts']['senderUnknownAtFirstObservation'],1);self.assertTrue(r['reports'][0]['trustNotEvaluated']);self.assertFalse(r['reports'][0]['laterOwnKnownCommander'])
 def test_later_knowledge_not_attributed_as_report_fact(self):
  d,a=fixture();later=copy.deepcopy(d);later['at']=30;later['reconstructedKnownAfter']=[['t','eltas']];r=m.census([d,later],[a],'g','eltas');self.assertEqual(r['counts']['targetAlreadyKnownAtFirstObservation'],0);self.assertEqual(r['reports'][0]['firstKnownAt'],30)
 def test_same_side_sender_does_not_assert_complete_trust(self):
  d,a=fixture();d['reconstructedKnownAfter']=[['s','kilder']];r=m.census([d],[a],'g','eltas');self.assertTrue(r['reports'][0]['senderKnownSameSide']);self.assertTrue(r['reports'][0]['trustNotEvaluated'])
 def test_unlinked_or_duplicate_send_rejected(self):
  d,a=fixture()
  for actions in [[],[a,a]]:
   with self.assertRaises(AssertionError):m.census([d],actions,'g','eltas')
 def test_empty_sample_not_claimed_no_delivery(self):
  r=m.census([],[],'g','eltas');self.assertEqual(r['counts']['uniqueObservedStoredCommanderReports'],0)
if __name__=='__main__':unittest.main()
