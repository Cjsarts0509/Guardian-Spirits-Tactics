"""Reclassify every066 recast against the fixed engine's verified exact-failure branch.

This links existing trajectory evidence to a synthetic engine semantics check.
It is not a whole-game counterfactual or a win / mana saving estimate.
"""
import collections,gzip,hashlib,importlib.util,json,pathlib,sys
sha=lambda b:hashlib.sha256(b).hexdigest()
def read(p):
    b=pathlib.Path(p).read_bytes();return gzip.decompress(b) if str(p).endswith('.gz') else b

def classify(raw_path,recasts_path,proof_path):
    raw=read(raw_path);data=json.loads(raw);recasts_raw=read(recasts_path);old=json.loads(recasts_raw);proof_raw=read(proof_path);proof=json.loads(proof_raw)
    assert proof['complete'] and proof['synthetic'] and proof['policyNotCalled'] and proof['newResearchExecutions']==0
    assert len(proof['negativeControls'])==2 and {x['on']['existingMarker'] for x in proof['negativeControls']}=={False,True}
    for x in proof['negativeControls']:
        on=x['on'];assert x['observerOnOffIdentical'] and on['fullStateSHA256']==x['offStateSHA256'] and on['engineLogSHA256']==x['offLogSHA256']
        assert on['failedTargetPurify']['targetAlive'] and on['priorTargetPurify']['targetAlive']!=on['existingMarker']
        assert on['finalMarker']==on['priorSuccessfulTarget']
        assert len(on['failureReceipts'])==2 and all(r['accepted'] for r in on['failureReceipts'])
        points=on['points'];assert len(points)==10 and all(p['externalGradingOnly'] and p['observerUnchanged'] and p['unrelatedReaderPrivateChaosEvents']==0 for p in points)
        for p in points[2:]:assert p['externalMarker']==on['priorSuccessfulTarget']
        result=[e for e in points[-1]['ownChaosEvents'] if e['kind']=='skill.chaos_hex.result'][-2:]
        assert len(result)==2 and all(e['data']=={'target':on['failureTarget'],'success':False} and not e.get('facts') for e in result)
    pos=proof['positiveControl'];assert pos['first']!=pos['second'] and pos['result']['data']=={'target':pos['second'],'success':True} and pos['changedAt']==pos['result']['at']
    engine_hash=proof['sourceHashes']['packages/rules/src/modes/troll.ts'];assert data['sourceHashes']['src/modes/troll.ts']==engine_hash
    script=pathlib.Path(__file__).with_name('analyze-own-failure-recasts.py');assert sha(script.read_bytes())==old['analysisSHA256']
    spec=importlib.util.spec_from_file_location('recasts',script);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    again=module.analyze(data);assert again['witnesses']==old['witnesses'] and again['variants']==old['variants']
    assert old['rawSHA256']==sha(raw);counts=collections.Counter();rows=[]
    for w in old['witnesses']:
        assert w['priorOwnResult']['data']=={'target':w['target'],'success':False}
        assert w['priorActualIntake']['record']['status']=='failed'
        assert w['currentOwnReceipt']['data']['target']==w['target']
        counts['actualRecasts']+=1;counts['nominalManaSpent']+=w['nominalMana'];counts['immediateManaDelta']+=w['afterMana']-w['beforeMana']
        result=w['currentOwnResult']
        if result:
            assert result['data']=={'target':w['target'],'success':False} and not result.get('facts')
            counts['observedFailedResultNoFactNoMarkerAssignment']+=1;classification='observed-exact-failure-no-fact-no-marker-assignment'
        else:
            counts['endedBeforeResultNoRequestTimeMarkerAssignment']+=1;classification='no-request-time-assignment-result-censored-at-end'
        rows.append({**w,'classification':classification,'engineSHA256':engine_hash,'classificationBasis':'fixed engine branch and real-engine positive/negative controls; no full-game intervention'})
    assert counts['actualRecasts']==counts['observedFailedResultNoFactNoMarkerAssignment']+counts['endedBeforeResultNoRequestTimeMarkerAssignment']
    return {'kind':'exact-failure-recast-consequence-classification','rawSHA256':sha(raw),'recastsDecodedSHA256':sha(recasts_raw),'engineProofSHA256':sha(proof_raw),'engineSHA256':engine_hash,'analysisSHA256':sha(pathlib.Path(__file__).read_bytes()),'newResearchExecutions':0,'newReplays':0,'counts':counts,'witnesses':rows,'limitations':['Existing actual trajectories plus synthetic branch checks, not whole-game counterfactuals.','Mana totals are actually spent on these requests, not causal savings from the candidate.','Exact failures do not assign the purify marker; successful or pending checks have different conditions.','Other action timing, resource, opportunity, or downstream effects are not ruled out.']}

if __name__=='__main__':
    r=classify(*sys.argv[1:4]);pathlib.Path(sys.argv[4]).write_text(json.dumps(r,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'counts':r['counts'],'newResearchExecutions':0}))
