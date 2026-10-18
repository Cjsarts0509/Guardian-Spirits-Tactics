"""Independent round056 proof/denominator audit. No policy decisions or new matches."""
import copy, gzip, hashlib, json, pathlib, sys

def read(path):
    b=pathlib.Path(path).read_bytes()
    return gzip.decompress(b) if str(path).endswith('.gz') else b

ATTACKS={'attack','advanced_attack','supreme_attack'}
def ready(v,known):
    dead={p.get('revealed') for p in v['players'] if not p['alive']}
    rows=[]
    for s in v['me']['skills']:
        if s['key'] not in ATTACKS or s['passive'] or s['blocked'] is not None: continue
        for p in v['players']:
            name=known.get(p['id'])
            if p['id']==v['me']['id'] or not p['alive'] or any(e['kind']=='invulnerable' for e in p['statuses']): continue
            if name is None or name not in (s['nameOptions'] or []): continue
            role=next(z for z in v['roster'] if z['key']==name)
            if role['side']==v['me']['side']: continue
            if name=='chis' and not {'satoshi','zwinra'}<=dead: continue
            rows.append(dict(skill=s['key'],target=p['id'],name=name,mana=s['mana']))
    return rows

def verify(d,raw,input_bytes):
    assert d['kind']=='round056-troll-regression-posthoc' and d['newResearchExecutions']==0
    assert d['inputSHA256']==hashlib.sha256(input_bytes).hexdigest()=='ee3a619c0c0d453174dd64533a838068acc6f8c4523fee4560c97774f34a8e77'
    assert d['candidateOptions']=={'verifyIncomingAllies':'commander-report-first'}
    assert d['settings']==raw['settings'] and len(d['records'])==6
    for path,h in d['sourceHashes'].items(): assert hashlib.sha256(pathlib.Path(path).read_bytes()).hexdigest()==h
    result=[]; seen=set()
    for r in d['records']:
        key=(r['fixture']['seed'],r['style'],r['fixture']['currentSide'],r['variant'])
        assert key not in seen; seen.add(key)
        o=next(o for o in raw['records'] if o['fixture']==r['fixture'] and o['style']==r['style'] and o['variant']==r['variant'])
        assert r['fixture']['mode']=='troll' and not r['fixture']['reversed']
        assert r['originalCollectorMatched'] and r['observerOnOffMatched'] and r['commandObserverOnOffMatched']
        assert r['own']['wholeGameAndReceiptsMatched'] and r['own']['game']==o['game']
        assert r['own']['matchedActions']==r['trace']['receipts']==len(o['actions'])
        other=next(o for o in raw['records'] if o['fixture']==r['fixture'] and o['style']==r['style'] and o['variant']=='candidate')
        driver=next(x for x in other['decisions'] if x['changed'] or x['originalAfterRng']!=x['chosenAfterRng'])
        assert driver==r['driver'] and r['prefixMatched']==driver['ordinal']
        control=next(o for o in raw['records'] if o['fixture']==r['fixture'] and o['style']==r['style'] and o['variant']=='control')
        assert control['actions'][:driver['ordinal']]==other['actions'][:driver['ordinal']]
        assert control['game']['winnerPolicy']=='current' and other['game']['winnerPolicy']=='reference'
        roles={p['id']:p['character'] for p in o['roles']}; events={}; previous=(-1,-1)
        for b in r['trace']['rows']:
            assert (b['at'],b['ordinal'])>=previous; previous=(b['at'],b['ordinal'])
            assert b['ordinal']>=driver['ordinal']
            if b['kind']=='action':
                a=o['actions'][b['ordinal']]; assert b['at']==a['at'] and b['actor']==a['player'] and b['action']==a['action']
                assert next(p for p in b['before'] if p['id']==a['player'])['mana']==a['beforeMana']
                assert next(p for p in b['after'] if p['id']==a['player'])['mana']==a['afterMana']
                assert [e['kind'] for e in b['events']]==a['receiptKinds']
            for e in b['events']:
                assert e['seq'] not in events;events[e['seq']]=e
        ready_rows=0;attack_selected=0;known_entries=0;guard_rows=0;guard_selected=0
        for c in r['own']['choices']:
            assert c['ownInputRebuilt'] and c['memoryAndEngineUnchanged'] and c['wrongKnown']==[]
            assert c['ordinal']>=driver['ordinal'] and c['view']['me']['id']==c['player'] and c['view']['elapsedMs']==c['at']
            known=dict(c['known']);cand=dict(c['candidates']);v=c['view'];known_entries+=len(known)
            assert all(roles[p]==name and cand[p]==[name] for p,name in known.items())
            for p in v['players']:
                assert not {'character','mana','flags','skills','allies','gem'}&p.keys()
            for e in c['events']:
                assert e['at']<=c['at'] and (e['vis']['to']=='all' or e['vis']['to']=='players' and c['player'] in e['vis']['ids'])
                if e['seq'] in events: assert e==events[e['seq']]
            rr=ready(v,known);assert rr==c['readyKnownAttacks']
            a=c['chosenAction']
            if a is not None:
                actual=o['actions'][c['ordinal']];assert actual['at']==c['at'] and actual['player']==c['player'] and actual['action']==a and actual['activePrimary']
            if rr:
                ready_rows+=1;attack_selected+=int(a is not None and a['type']=='skill' and any(a.get('skill')==z['skill'] and a.get('target')==z['target'] and a.get('name')==z['name'] for z in rr))
            chief=next((p for p in v['players'] if p['alive'] and known.get(p['id'])=='chis'),None)
            guard=next((s for s in v['me']['skills'] if s['key']=='chief_protection' and s['blocked'] is None),None)
            if chief and guard:
                guard_rows+=1;guard_selected+=int(a is not None and a.get('skill')=='chief_protection' and a.get('target')==chief['id'])
        dead_events=[(b,e) for b in r['trace']['rows'] for e in b['events'] if e['kind']=='death']
        for b,e in dead_events:
            p=e['data']['player'];assert next(z for z in b['before'] if z['id']==p)['alive'] and not next(z for z in b['after'] if z['id']==p)['alive']
        reports=[a for a in o['actions'] if a['grade']['reportTarget'] and a['side']==o['fixture']['currentSide']]
        assert all(a['grade']['reportedName']==a['grade']['reportActualName'] for a in reports)
        result.append(dict(seed=r['fixture']['seed'],style=r['style'],variant=r['variant'],matchedActions=len(o['actions']),activeChoices=len(r['own']['choices']),knownEntries=known_entries,readyKnownAttackChoices=ready_rows,selectedReadyKnownAttacks=attack_selected,readyConfirmedChiefProtectionChoices=guard_rows,selectedChiefProtection=guard_selected,actualReports=len(reports),wrongEmittedNames=0,resources=o['resources'],endAt=o['game']['elapsedMs'],deaths=[dict(at=b['at'],actor=b['actor'],action=b['action'],**e['data']) for b,e in dead_events]))
    assert seen=={(152007,'truthful',1,v) for v in ['control','candidate']}|{(152002,'bluff',2,v) for v in ['control','candidate']}|{(152005,'skill-aware-bluff',2,v) for v in ['control','candidate']}
    return dict(kind='round056-independent-summary',newResearchExecutions=0,matchedGames=6,matchedActions=sum(r['matchedActions'] for r in result),activeChoices=sum(r['activeChoices'] for r in result),knownEntries=sum(r['knownEntries'] for r in result),wrongKnown=0,records=result,limitations=['Ready-known attack/protection counts are public-rule resource candidates, not exact internal stage opportunities.','resources.falseReports is the historical stored-map ambiguity, not emitted false reports.','Outcome-selected pairs cannot estimate population improvement or single-action causal effects.'])

if __name__=='__main__':
    diag,original,out=sys.argv[1:4];b=read(original);raw=json.loads(b);d=json.loads(read(diag));summary=verify(d,raw,b)
    if '--test' in sys.argv:
        tests=0
        def reject(change):
            global tests
            x=copy.deepcopy(d);change(x)
            try:verify(x,raw,b)
            except (AssertionError,KeyError,StopIteration,IndexError):tests+=1
            else:raise AssertionError('tamper accepted')
        reject(lambda x:x.update(inputSHA256='0'*64))
        reject(lambda x:x.update(candidateOptions={}))
        reject(lambda x:x['records'][0].update(prefixMatched=0))
        reject(lambda x:x['records'][0]['own']['choices'][0]['known'][0].__setitem__(1,'forged'))
        reject(lambda x:x['records'][0]['own']['choices'][0]['view']['players'][0].update(mana=123))
        reject(lambda x:x['records'][0]['own']['choices'][0]['events'][0].update(vis={'to':'players','ids':['not-self']}))
        reject(lambda x:next(p for p in x['records'][0]['trace']['rows'][0]['before'] if p['id']==x['records'][0]['trace']['rows'][0]['actor']).update(mana=123456))
        reject(lambda x:x['records'][0]['own']['choices'][0].update(readyKnownAttacks=[{'skill':'forged'}]))
        summary['independentTests']={'valid':1,'tamperRejected':tests}
    pathlib.Path(out).write_text(json.dumps(summary,ensure_ascii=False,sort_keys=True,indent=2)+'\n')
    print(json.dumps({k:v for k,v in summary.items() if k!='records'}))
