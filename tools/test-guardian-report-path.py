"""Receiver-only semantic boundaries and corrupted join rejection; not research games."""
import copy
import importlib.util
import unittest

spec = importlib.util.spec_from_file_location('path_audit', 'tools/guardian-report-path.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
def choice(known=(), events=None, ordinal=1, at=10):
    return dict(player='g', at=at, beforeAppliedActions=ordinal, known=list(known), events=events or [],
        memoryUnchanged=True, engineUnchanged=True, chosenAction=None, diagnostic=dict(reason='identity_unconfirmed'),
        view=dict(elapsedMs=at, me=dict(id='g',side=1),
        players=[dict(id=p,seat=i+1,alive=True) for i,p in enumerate(['g','t','s','u'])],
        roster=[dict(key=k,name=n,side=s,inGame=True) for k,n,s in [('rael','라엘',1),('kane','케인',1),('eltas','엘타스',2)]]))
def event(sender='s', role='라엘', seq=1, to='g', at=5):
    return dict(seq=seq,at=at,kind='chat.whisper',vis=dict(to='players',ids=[sender,to]),
                data=dict(**{'from':sender},to=to,channel='whisper',text='확인 정보: [2] '+role))
def action(e):
    return dict(player=e['data']['from'],at=e['at'],accepted=True,action=dict(type='chat',channel='whisper',to=e['data']['to'],text=e['data']['text']))
def pair(d, actions):
    original=dict(result=dict(actions=actions));record=dict(wholeGameAndAllActionsMatched=True,originalCollectorMatched=True,
        originalRecordSHA256=m.sha(m.enc(original)),decisions=[d])
    return record, original
class Boundaries(unittest.TestCase):
    def test_unknown_sender_not_trusted(self):
        r=m.own_report_state(choice(events=[event()]),'t')
        self.assertEqual(r['state'],'no_confirmed_living_ally_sender');self.assertIsNone(r['knownTarget'])
    def test_published_or_actual_truth_not_consulted(self):
        d=choice(events=[event()]);d['view']['players'][2]['published']='rael'
        self.assertEqual(m.own_report_state(d,'t')['reports'][0]['senderStatus'],'sender_unconfirmed')
    def test_consensus_not_fact_or_trusted_intel(self):
        r=m.own_report_state(choice([('s','rael')],[event()]),'t')
        self.assertEqual(r['state'],'sender_consensus_candidates_unobserved');self.assertIsNone(r['knownTarget'])
        self.assertEqual(r['trustedIntel'],'not_reconstructed')
    def test_enemy_sender(self):
        r=m.own_report_state(choice([('s','eltas')],[event()]),'t')
        self.assertEqual(r['reports'][0]['senderStatus'],'sender_not_own_side')
    def test_dead_confirmed_sender_not_reenabled(self):
        d=choice([('s','rael')],[event()]);d['view']['players'][2]['alive']=False
        self.assertEqual(m.own_report_state(d,'t')['reports'][0]['senderStatus'],'sender_dead')
    def test_conflicting_confirmed_senders(self):
        d=choice([('s','rael'),('u','kane')],[event(),event('u','케인',2)])
        self.assertEqual(m.own_report_state(d,'t')['state'],'conflicting_confirmed_ally_reports')
    def test_latest_sender_report_overwrites(self):
        d=choice([('s','rael')],[event(),event(role='케인',seq=2)])
        self.assertEqual(m.own_report_state(d,'t')['eligibleReportNames'],['kane'])
    def test_known_target_not_report_derived(self):
        r=m.own_report_state(choice([('t','rael')],[event(role='엘타스')]),'t')
        self.assertEqual(r['state'],'already_known');self.assertEqual(r['knownTarget'],'rael')
    def test_same_tick_action_ordinal_join(self):
        e=event(at=10);r,o=pair(choice(events=[e],ordinal=0),[action(e)])
        with self.assertRaises(AssertionError):m.validate_choices(r,o)
        r['decisions'][0]['beforeAppliedActions']=1
        self.assertEqual(m.validate_choices(r,o),{('g',1):0})
    def test_missing_receipt_vs_censoring(self):
        e=event();r,o=pair(choice(ordinal=0),[action(e)]);joins=m.validate_choices(r,o)
        x=m.episode(r,o,'g','t',1,None,joins)
        self.assertEqual(x['classification'],'addressed_no_later_choice_censored')
        r['decisions'][0]['beforeAppliedActions']=1
        with self.assertRaises(AssertionError):m.episode(r,o,'g','t',1,None,joins)
    def test_other_recipient_not_failed_delivery(self):
        e=event(to='u');r,o=pair(choice(),[action(e)])
        x=m.episode(r,o,'g','t',1,None,{})
        self.assertEqual(x['classification'],'reported_only_to_others')
    def test_foreign_private_event_rejected(self):
        r,o=pair(choice(events=[event(to='u')]),[action(event(to='u'))])
        with self.assertRaises(AssertionError):m.validate_choices(r,o)
    def test_private_other_fields_rejected(self):
        r,o=pair(choice(),[]);r['decisions'][0]['beforeAppliedActions']=0
        r['decisions'][0]['view']['players'][1]['mana']=100
        with self.assertRaises(AssertionError):m.validate_choices(r,o)
    def test_prefix_rewrite_rejected(self):
        e=event();r,o=pair(choice(events=[e]),[action(e)]);d=copy.deepcopy(r['decisions'][0]);d['at']=20;d['view']['elapsedMs']=20;d['events'][0]['data']['text']='수정';r['decisions'].append(d)
        with self.assertRaises(AssertionError):m.validate_choices(r,o)
    def test_original_change_rejected(self):
        r,o=pair(choice(ordinal=0),[]);o['result']['actions'].append(action(event()))
        with self.assertRaises(AssertionError):m.validate_choices(r,o)
    def test_dead_boundary_excludes_later_message(self):
        e=event();r,o=pair(choice(ordinal=0),[dict(action(e),accepted=False),action(e)])
        self.assertEqual(m.episode(r,o,'g','t',1,None,{})['classification'],'no_report_command')
if __name__=='__main__':unittest.main()
