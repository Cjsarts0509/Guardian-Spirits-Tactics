"""059 independent structural audit of evidence; not an independent TypeScript engine."""
import copy,gzip,hashlib,json,sys
from pathlib import Path
def read(p):
    b=Path(p).read_bytes()
    return gzip.decompress(b) if str(p).endswith('.gz') else b
def packed(x):return json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()
def sha(b):return hashlib.sha256(b).hexdigest()
def verify(d,src,baseline):
    assert d['kind']=='round059-passive-own-delayed-memory'
    assert d['newResearchExecutions']==d['newResearchSeeds']==0
    assert d['inputSHA256']==sha(src)
    assert d['options']=={'rememberOwnDelayedCheck':True,'behavior':'passive memory only','delayMs':60000,'recordLimit':64}
    assert d['optionsSHA256']==sha(packed(d['options']))
    old=json.loads(src);assert len(old['replays'])==len(d['observations'])==96
    counts={};total=0
    for r,p in zip(d['observations'],old['replays']):
        for k in ['fixture','variant','style']:assert r[k]==p[k]
        assert len(r['rows'])==len(p['choices'])
        for row,c in zip(r['rows'],p['choices']):
            total+=1;counts[r['variant']]=counts.get(r['variant'],0)+1
            assert row['inputSHA256']==sha(packed({'view':c['view'],'events':c['events']}))
            assert row['actual']==row['expected']==c['waiting']
            assert row['knowledgeAndOldMemoryEqual'] and row['observerUnchanged'] and row['reversedReceiptOrderEqual']
            for rec in row['records']:
                receipts=[e for e in c['events'] if e['seq']==rec['receiptSeq'] and e['kind']=='skill.chaos_hex.self']
                assert len(receipts)==1
                e=receipts[0];assert e['vis']=={'to':'players','ids':[row['player']]}
                assert e['data']['target']==rec['target'] and e['at']==rec['at'] and rec['due']==rec['at']+60000
                assert e['at']<=row['at'] and 'character' not in rec
                if 'result' in rec:
                    result=rec['result'];matches=[e for e in c['events'] if e['seq']==result['seq'] and e['kind']=='skill.chaos_hex.result']
                    assert len(matches)==1;e=matches[0]
                    assert e['data']['target']==rec['target'] and e['at']==rec['due']==result['at']
                    assert e['data']['success']==result['success'] and e['at']<=row['at']
    assert total==829 and counts=={'control':414,'candidate':415}
    kinds=['success','failure','actor-left','target-left','end-before-due','rejected']
    assert [c['kind'] for c in d['cases']]==kinds
    for case in d['cases']:
        assert len(case['points'])==5
        for p in case['points']:
            for flag in ['fullDeltaEqual','nextActionChatRngEqual','controlKnowledgeAndMemoryEqual','observerUnchanged','duplicateIdempotent']:assert p[flag]
            assert len(p['records'])==(0 if case['kind']=='rejected' else 1)
            for rec in p['records']:
                assert rec['target']==case['target'] and rec['at']==1000 and rec['due']==61000
                expected='ended-unresolved' if p['phase']=='ended' else 'pending' if p['at']<61000 else 'failed' if case['kind']=='failure' else 'succeeded'
                assert rec['status']==expected
                assert ('result' in rec)==(expected in ['succeeded','failed'])
    assert [r['core'] for r in d['regressions']]==baseline['rows']
    assert d['baselineSourceRef']==baseline['sourceRef']
    assert d['summary']=={'scenarios':6,'checkpoints':30,'restoredCheckpoints':30,'knownAndOldMemoryUnchanged':30,
      'storedRecords':96,'storedOwnInputs':829,'pendingMatches':829,'wrongPendingTargets':0,'newIdentityClaimsFromLedger':0,
      'hostDivergences':0,'syntheticLimitedRegressionRuns':4,'prechangeRegressionMatches':4,'limitedRegressionsUnfinished':4}
    return {'valid':True,**d['summary'],'perVariant':counts,'scope':'Cross-file evidence and counts; runtime equality flags are supported by engine tests, not independently simulated here.'}
def main():
    raw,src=read(sys.argv[1]),read(sys.argv[2]);d=json.loads(raw);baseline=json.loads(read(sys.argv[3]));summary=verify(d,src,baseline)
    changes=[lambda x:x.update(newResearchExecutions=1),lambda x:x.update(inputSHA256='bad'),
      lambda x:x['options'].update(delayMs=1),lambda x:x['cases'][0]['points'][0]['records'][0].update(status='succeeded'),
      lambda x:next(r for r in x['observations'] if r['rows'])['rows'][0]['actual'][0].update(target='wrong'),
      lambda x:x['regressions'][0]['core'].update(traceSHA256='wrong'),lambda x:x['summary'].update(hostDivergences=1),
      lambda x:next(r for r in x['observations'] if r['rows'])['rows'][0].update(inputSHA256='wrong')]
    for mutate in changes:
        bad=copy.deepcopy(d);mutate(bad)
        try:verify(bad,src,baseline)
        except AssertionError:continue
        raise AssertionError('tamper accepted')
    summary['tamperRejected']=len(changes)
    if len(sys.argv)>4:Path(sys.argv[4]).write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(summary,ensure_ascii=False))
if __name__=='__main__':main()
