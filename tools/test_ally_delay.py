import copy,unittest,importlib.util,pathlib
spec=importlib.util.spec_from_file_location('learn_ally_delay',pathlib.Path(__file__).with_name('learn-ally-delay.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
SETTINGS,fit=module.SETTINGS,module.fit
def fixture(seeds=16):
    pairs=[]
    for seed in range(seeds):
        for _ in range(3):
            point={'cell':'E0L0','before':{'knownEnemy':False,'afterMana':25},'accepted':True}
            def r(w):return {'point':copy.deepcopy(point),'safety':{'wrongAllies':0,'falseReports':0},'game':{'winnerPolicy':w,'stats':{'current':{'earlyAttackFailures':0}}}}
            pairs.append({'fixture':{'seed':seed},'control':r('reference'),'delay':r('current')})
    return {'kind':'first-low-mana-confirmed-ally-single-delay','phase':'training-diagnostic','complete':True,'learning':copy.deepcopy(SETTINGS),'rows':[{'pairs':pairs}],'start':0,'count':seeds,'executions':2*len(pairs)}
class LearnerTests(unittest.TestCase):
    def test_positive_requires_preregistered_size_and_lower_bound(self):self.assertEqual(fit(fixture())['delayCells'],['E0L0'])
    def test_insufficient_seeds_keeps_original(self):self.assertEqual(fit(fixture(15))['delayCells'],[])
    def test_no_gain_keeps_original(self):
        d=fixture()
        for p in d['rows'][0]['pairs']:p['delay']['game']['winnerPolicy']='reference'
        self.assertEqual(fit(d)['delayCells'],[])
    def test_safety_failure_keeps_original(self):
        d=fixture();d['rows'][0]['pairs'][0]['delay']['safety']['wrongAllies']=1;self.assertEqual(fit(d)['delayCells'],[])
    def test_rejected_control_is_not_post_treatment_filtered(self):
        d=fixture();d['rows'][0]['pairs'][0]['control']['point']['accepted']=False;self.assertEqual(fit(d)['cells']['E0L0']['pairs'],48)
    def test_incomplete_changed_design_or_wrong_own_cell_rejected(self):
        for mutate in [lambda d:d.update(complete=False),lambda d:d['learning'].update(minSeeds=1),lambda d:d['rows'][0]['pairs'][0]['control']['point'].update(cell='E1L0')]:
            d=fixture();mutate(d)
            with self.assertRaises(ValueError):fit(d)
if __name__=='__main__':unittest.main()
