import copy,importlib.util,pathlib,unittest
spec=importlib.util.spec_from_file_location('a',pathlib.Path(__file__).with_name('analyze-own-share-path.py'));a=importlib.util.module_from_spec(spec);spec.loader.exec_module(a)
def choice():return dict(diagnostic=dict(peers=[dict(id='g',alive=True,known='consume',outgoingAlly=True,reason='eligible_friend')],targets=[dict(id='t')],pairs=[dict(to='g',target='t',alreadySent=False,tooLong=False,text='info')],cooldownRemainingMs=0,proposal=dict(to='g',text='info')))
class States(unittest.TestCase):
 def classify(self,d):return a.classify(d,'g','t')
 def test_selected(self):self.assertEqual(self.classify(choice()),'selected_pair')
 def test_unknown_commander(self):
  d=choice();d['diagnostic']['targets']=[];self.assertEqual(self.classify(d),'commander_not_own_confirmed')
 def test_unknown_guardian_despite_route(self):
  d=choice();d['diagnostic']['peers'][0]['known']=None;self.assertEqual(self.classify(d),'guardian_not_own_confirmed')
 def test_known_but_no_route(self):
  d=choice();d['diagnostic']['peers'][0]['outgoingAlly']=False;self.assertEqual(self.classify(d),'no_outgoing_ally_route')
 def test_dead(self):
  d=choice();d['diagnostic']['peers'][0]['alive']=False;self.assertEqual(self.classify(d),'guardian_dead')
 def test_already_sent(self):
  d=choice();d['diagnostic']['pairs'][0]['alreadySent']=True;self.assertEqual(self.classify(d),'already_sent')
 def test_interval(self):
  d=choice();d['diagnostic']['cooldownRemainingMs']=1;self.assertEqual(self.classify(d),'send_interval')
 def test_priority_not_delivery_failure(self):
  d=choice();d['diagnostic']['proposal']['to']='other';self.assertEqual(self.classify(d),'earlier_priority_pair')
if __name__=='__main__':unittest.main()
