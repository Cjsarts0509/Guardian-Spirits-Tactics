"""060 independent cross-file command/receipt/intake/censoring audit, no engine reimplementation."""
import copy,gzip,hashlib,json,sys
from pathlib import Path
def read(p):
    b=Path(p).read_bytes();return gzip.decompress(b) if str(p).endswith('.gz') else b
def packed(x):return json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()
def sha(b):return hashlib.sha256(b).hexdigest()
def key(x):return json.dumps([x['fixture'],x['style'],x['variant']],sort_keys=True)
FIELDS=['player','at','action','accepted','error','side','character','beforeMana','afterMana','maxMana','nominalMana','receiptKinds']
def verify(d,original,census,input_sha,census_sha):
    assert d['kind']=='round060-live-delayed-memory-census' and d['completed']
    assert d['newResearchExecutions']==d['newResearchSeeds']==0
    assert d['inputSHA256']==input_sha and d['censusSHA256']==census_sha
    assert d['optionsSHA256']==sha(packed(d['options']))
    assert d['options']=={'control':{'rememberOwnDelayedCheck':True},'candidate':{'verifyIncomingAllies':'commander-report-first','rememberOwnDelayedCheck':True}}
    assert d['settings']==original['settings']
    old={key(r):r for r in original['records']};prior={key(r):r for r in census['replays']}
    assert len(d['records'])==d['targetRecords']==len(prior)==96
    assert [key(r) for r in d['records']]==list(prior)
    totals={v:{'games':0,'actions':0,'receipts':0,'receiptObserved':0,'results':0,'resultObserved':0,
      'postmortemResult':0,'noLaterLiveUpdate':0,'endedBeforeResult':0,'successObserved':0,'failureObserved':0} for v in ['control','candidate']}
    for r in d['records']:
        o=old[key(r)];p=prior[key(r)];n=totals[r['variant']];n['games']+=1;n['actions']+=r['actions']
        assert r['game']==o['game']==p['game']
        assert r['originalCommandsResourcesMatched'] and r['observerOnOffMatched']
        projected=[{f:a[f] for f in FIELDS} for a in o['actions']]
        assert r['actions']==len(projected)==p['matchedActions']
        assert r['actionsSHA256']==sha(packed(projected))==p['actionsSHA256']
        assert len(r['episodes'])==len(p['requests'])
        for ep,request in zip(r['episodes'],p['requests']):
            n['receipts']+=1;e=ep['receipt'];actor=ep['actor'];target=e['data']['target'];due=e['at']+60000
            assert request=={'actor':actor,'target':target,'at':e['at'],'due':due,'ordinal':ep['ordinal']}
            matching=[q for q in p['receipts'] if q['actor']==actor and q['event']['seq']==e['seq']]
            assert len(matching)==1 and matching[0]['event']==e
            assert e['vis']=={'to':'players','ids':[actor]} and e['kind']=='skill.chaos_hex.self'
            results=[q for q in p['receipts'] if q['actor']==actor and q['event']['kind']=='skill.chaos_hex.result'
              and q['event']['at']==due and q['event']['data']['target']==target]
            assert len(results)<=1
            assert ep['result']==(results[0]['event'] if results else None)
            if results:
                n['results']+=1;assert ep['aliveAtResultCollection']==results[0]['actorAlive']
            for label in ['firstReceiptSeen','firstResultSeen']:
                seen=ep[label]
                if not seen:continue
                rec=seen['record'];assert seen['phase']=='running' and seen['alive'] is True
                assert rec['receiptSeq']==e['seq'] and rec['target']==target and rec['at']==e['at'] and rec['due']==due
                assert seen['at']>=e['at'] and seen['consumedThrough']>=e['seq']
                assert any(x['actor']==actor and x['at']==seen['at'] and x['stage']==seen['stage'] and x['consumedThrough']==seen['consumedThrough'] for x in r['observations'])
                if label=='firstResultSeen':
                    result=ep['result'];assert result and seen['at']>=result['at'] and seen['consumedThrough']>=result['seq']
                    assert rec['result']=={'seq':result['seq'],'at':result['at'],'success':result['data']['success']}
                    assert rec['status']==('succeeded' if result['data']['success'] else 'failed')
            n['receiptObserved']+=bool(ep['firstReceiptSeen']);n['resultObserved']+=bool(ep['firstResultSeen'])
            assert ep['receiptIntake']==('observed' if ep['firstReceiptSeen'] else 'no-live-memory-update-before-end')
            if ep['firstResultSeen']:
                classification='observed';n['successObserved' if ep['result']['data']['success'] else 'failureObserved']+=1
            elif ep['result']:
                classification='no-later-live-memory-update' if ep['aliveAtResultCollection'] else 'postmortem-result'
                n['noLaterLiveUpdate' if ep['aliveAtResultCollection'] else 'postmortemResult']+=1
            else:classification='ended-before-result';n['endedBeforeResult']+=1
            assert ep['resultIntake']==classification
        assert r['primaryCompared']>0 and r['chatCompared']>0
    assert d['summary']=={'records':96,'actions':10157,'receipts':298,
      'primaryComparisons':sum(r['primaryCompared'] for r in d['records']),
      'chatComparisons':sum(r['chatCompared'] for r in d['records']),
      'intakeObservations':sum(len(r['observations']) for r in d['records'])}
    assert all(n['receipts']==149 for n in totals.values())
    return {'valid':True,**d['summary'],'byVariant':totals,'scope':'Independent original command/receipt/censoring links; actual memory checks use recorded runtime witnesses.'}
def main():
    raw,src,old=map(read,sys.argv[1:4]);d=json.loads(raw);original=json.loads(src);census=json.loads(old)
    args=(original,census,sha(src),sha(old));s=verify(d,*args)
    first=lambda x:x['records'][0]['episodes'][0]
    first_result=lambda x:next(ep for r in x['records'] for ep in r['episodes'] if ep['firstResultSeen'])
    changes=[lambda x:x.update(newResearchExecutions=1),lambda x:x.update(inputSHA256='bad'),
      lambda x:x['records'][0].update(actionsSHA256='bad'),lambda x:first(x)['receipt']['data'].update(target='wrong'),
      lambda x:first(x)['firstReceiptSeen'].update(at=-1),lambda x:first_result(x)['firstResultSeen']['record']['result'].update(seq=-1),
      lambda x:first_result(x).update(resultIntake='postmortem-result'),lambda x:first(x)['firstReceiptSeen'].update(alive=False)]
    for mutate in changes:
        bad=copy.deepcopy(d);mutate(bad)
        try:verify(bad,*args)
        except AssertionError:continue
        raise AssertionError('tampered witness accepted')
    s['tamperRejected']=len(changes);s['rawSHA256']=sha(raw)
    if len(sys.argv)>4:Path(sys.argv[4]).write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(s,ensure_ascii=False))
if __name__=='__main__':main()
