import copy, importlib.util, pathlib, unittest

spec=importlib.util.spec_from_file_location('claim_learner',pathlib.Path(__file__).with_name('learn-claim-intervention.py'))
learner=importlib.util.module_from_spec(spec);spec.loader.exec_module(learner)

def data(seeds=8,pairs=4,reward=1):
    rows=[]
    for seed in range(seeds):
        for _ in range(pairs):
            p={'cell':'C0G1T1','before':{'commander':False,'gem':2,'nextTurnInMs':43000},'accepted':True}
            rows.append({'fixture':{'seed':seed},'control':{'point':p,'game':{'winnerPolicy':'reference' if reward>0 else 'current'}},'truthful':{'point':copy.deepcopy(p),'game':{'winnerPolicy':'current' if reward>0 else 'reference'}}})
    return {'kind':'first-false-claim-single-intervention','phase':'training-diagnostic','complete':True,'start':128000,'count':seeds,'executions':len(rows)*2,'learning':copy.deepcopy(learner.SETTINGS),'rows':[{'pairs':rows}]}

class ClaimLearnerTests(unittest.TestCase):
    def test_positive_seed_supported_cell_only(self):
        m=learner.fit(data());self.assertEqual(m['truthfulCells'],['C0G1T1']);self.assertFalse(m['promotionEvidence'])
    def test_negative_or_sparse_evidence_keeps_policy(self):
        self.assertEqual(learner.fit(data(reward=-1))['truthfulCells'],[])
        self.assertEqual(learner.fit(data(seeds=7,pairs=20))['truthfulCells'],[])
        self.assertEqual(learner.fit(data(seeds=8,pairs=2))['truthfulCells'],[])
    def test_seed_block_unit_not_fixture_count(self):
        m=learner.fit(data(seeds=1,pairs=100));self.assertEqual(m['cells']['C0G1T1']['seeds'],1);self.assertEqual(m['truthfulCells'],[])
    def test_unequal_fixture_counts_do_not_replace_seed_weighting(self):
        d=data(seeds=8,pairs=3)
        negative=copy.deepcopy(d['rows'][0]['pairs'][0]);negative['control']['game']['winnerPolicy']='current';negative['truthful']['game']['winnerPolicy']='reference'
        d['rows'][0]['pairs']=[p for p in d['rows'][0]['pairs'] if p['fixture']['seed']!=0]+[copy.deepcopy(negative) for _ in range(24)]
        d['executions']=len(d['rows'][0]['pairs'])*2
        m=learner.fit(d);self.assertAlmostEqual(m['cells']['C0G1T1']['difference'],.75);self.assertEqual(m['truthfulCells'],['C0G1T1'])
    def test_reproducibility_and_self_view_feature_validation(self):
        d=data();self.assertEqual(learner.fit(d),learner.fit(copy.deepcopy(d)))
        d['rows'][0]['pairs'][0]['control']['point']['cell']='C1G1T1'
        with self.assertRaises(ValueError):learner.fit(d)
    def test_incomplete_or_changed_settings_rejected(self):
        d=data();d['complete']=False
        with self.assertRaises(ValueError):learner.fit(d)
        d=data();d['learning']['minSeeds']=1
        with self.assertRaises(ValueError):learner.fit(d)

if __name__=='__main__':unittest.main()
