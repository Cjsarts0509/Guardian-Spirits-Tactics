"""Independent057 census and own-receipt denominator audit; no new policy or matches."""
import copy,gzip,hashlib,json,pathlib,sys

CHECKS={'truth_gem','ally_check','enemy_check','advanced_ally_check','advanced_enemy_check','scan','ally_scan','enemy_scan','advanced_scan','troll_scan','troll_ally_scan','troll_enemy_scan'}
def read(p):
    b=pathlib.Path(p).read_bytes();return gzip.decompress(b) if str(p).endswith('.gz') else b
def key(r):
    f=r['fixture'];return (f['mode'],f['seed'],f['count'],f['reversed'],f['currentSide'],r['style'],r['variant'])
def own(e,p):return e['vis']['to']=='players' and p in e['vis']['ids']
def waiting(events,p,at):
    return [dict(target=e['data']['target'],at=e['at'],due=e['at']+60000,receiptSeq=e['seq']) for e in events if e['kind']=='skill.chaos_hex.self' and own(e,p) and e['at']<=at<e['at']+60000 and not any(z['kind']=='skill.chaos_hex.result' and own(z,p) and z.get('data',{}).get('target')==e['data']['target'] and z['seq']>e['seq'] and z['at']<=at for z in events)]
def ledger(r):
    req=[dict(actor=a['player'],target=a['action'].get('target'),at=a['at'],due=a['at']+60000,ordinal=i) for i,a in enumerate(r['actions']) if a['side']==r['fixture']['currentSide'] and a['accepted'] and a['action'].get('skill')=='chaos_hex']
    ext=[dict(ordinal=i,actor=a['player'],target=a['action'].get('target'),at=a['at'],action=a['action'],accepted=a['accepted'],beforeMana=a['beforeMana'],afterMana=a['afterMana']) for i,a in enumerate(r['actions']) if a['side']==r['fixture']['currentSide'] and a['action'].get('skill') in CHECKS and any(q['actor']==a['player'] and q['target']==a['action'].get('target') and q['ordinal']<i and a['at']<q['due'] for q in req)]
    return req,ext
def validate(d,raw,rawbytes):
    assert d['kind']=='round057-all-games-pending-census' and d['newResearchExecutions']==0
    assert d['inputSHA256']==hashlib.sha256(rawbytes).hexdigest()=='ee3a619c0c0d453174dd64533a838068acc6f8c4523fee4560c97774f34a8e77'
    assert d['options']==raw['options'] and d['optionsSHA256']==raw['candidateOptionsSHA256'] and d['settings']==raw['settings']
    for p,h in d['sourceHashes'].items():assert hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==h
    originals={key(r):r for r in raw['records'] if r['variant'] in ['control','candidate']}
    rows={key(r):r for r in d['records']};replays={key(r):r for r in d['replays']}
    assert len(rows)==len(d['records'])==len(originals)==768 and len(replays)==len(d['replays'])
    assert set(rows)==set(originals)
    totals={v:{m:dict(games=0,requests=0,requestsWithExtra=0,extraChecks=0,acceptedExtra=0,extraNominalMana=0,extraNetManaDelta=0,extraConfirmed=0,extraUnconfirmed=0,extraKnownBefore=0,pendingChoices=0,originallyStoredReportChoices=0,pendingTargetSlots=0,unknownLiveSlots=0,knownSlots=0,deadSlots=0,delayedSuccess=0,delayedFailure=0,resultPostmortem=0,endBeforeDue=0,unobservedResult=0,matchedActions=0) for m in ['civil_war','primordial','lidellut','troll']} for v in ['control','candidate']}
    for modes in totals.values():
        for t in modes.values():t.update(requestsWithActive=0,requestsWithUnknownLiveChoice=0,resultAliveSuccess=0,resultAliveFailure=0,resultPostmortemSuccess=0,resultPostmortemFailure=0,otherSameTargetActions=0,earlyConfirmedFollowupActions=0)
    details=[];known_entries=0
    for k,o in originals.items():
        row=rows[k];req,ext=ledger(o);assert row['requests']==req and row['extra']==ext
        assert row['totalActiveChoices']==o['counters']['activeChoices'] and row['storedReportChoices']==len(o['decisions'])
        t=totals[o['variant']][o['fixture']['mode']];t['games']+=1;t['requests']+=len(req);t['extraChecks']+=len(ext)
        t['requestsWithExtra']+=sum(any(e['actor']==q['actor'] and e['target']==q['target'] and q['ordinal']<e['ordinal'] and e['at']<q['due'] for e in ext) for q in req)
        t['otherSameTargetActions']+=sum(a['action']['type']=='skill' and a['action'].get('skill') not in CHECKS and any(q['actor']==a['player'] and q['target']==a['action'].get('target') and q['ordinal']<i and a['at']<q['due'] for q in req) for i,a in enumerate(o['actions']))
        if not req:assert k not in replays;continue
        p=replays[k];assert p['requests']==req and p['game']==o['game']
        assert p['originalCollectorMatched'] and p['observerOnOffMatched'] and p['wholeGameAndReceiptsMatched'] and p['matchedActions']==len(o['actions']);t['matchedActions']+=p['matchedActions']
        assert [{z:e[z] for z in x} for x,e in zip(ext,p['extra'])]==ext and len(ext)==len(p['extra'])
        roles={r['id']:r['character'] for r in o['roles']};seen_events=set()
        for z in p['receipts']:
            e=z['event'];assert own(e,z['actor']) and (z['actor'],e['seq']) not in seen_events;seen_events.add((z['actor'],e['seq']))
            assert e['kind'] in ['skill.chaos_hex.self','skill.chaos_hex.result']
        for q in req:
            calls=[c for c in p['choices'] if c['player']==q['actor'] and q['ordinal']<c['ordinal'] and q['at']<=c['at']<q['due']]
            t['requestsWithActive']+=bool(calls);t['requestsWithUnknownLiveChoice']+=any(q['target'] not in dict(c['known']) and next(z for z in c['view']['players'] if z['id']==q['target'])['alive'] for c in calls)
            start=[z for z in p['receipts'] if z['actor']==q['actor'] and z['event']['kind']=='skill.chaos_hex.self' and z['event']['at']==q['at'] and z['event']['data']['target']==q['target']];assert len(start)==1
            result=[z for z in p['receipts'] if z['actor']==q['actor'] and z['event']['kind']=='skill.chaos_hex.result' and z['event']['at']==q['due'] and z['event']['data']['target']==q['target']];assert len(result)<=1
            if result:
                z=result[0];success=z['event']['data']['success'];t['delayedSuccess' if success else 'delayedFailure']+=1;t['resultPostmortem']+=not z['actorAlive'];t[('resultAlive' if z['actorAlive'] else 'resultPostmortem')+('Success' if success else 'Failure')]+=1
                if success:assert any(f['player']==q['target'] and f['character']==roles[q['target']] for f in z['event'].get('facts',[]))
            elif o['game']['elapsedMs']<q['due']:t['endBeforeDue']+=1
            else:t['unobservedResult']+=1
        for c in p['choices']:
            assert c['memoryAndEngineUnchanged'] and c['ownKnowledgeRebuilt'];t['pendingChoices']+=1;t['originallyStoredReportChoices']+=any(z['player']==c['player'] and z['ordinal']==c['ordinal'] and z['at']==c['at'] for z in o['decisions'])
            v=c['view'];assert v['me']['id']==c['player'] and v['me']['alive'] and v['elapsedMs']==c['at']
            w=waiting(c['events'],c['player'],c['at']);assert w and w==c['waiting']
            expected=[q for q in req if q['actor']==c['player'] and q['ordinal']<c['ordinal'] and q['at']<=c['at']<q['due']];assert {(q['target'],q['at']) for q in expected}=={(q['target'],q['at']) for q in w}
            known=dict(c['known']);cand=dict(c['candidates']);known_entries+=len(known)
            assert all(roles[target]==name and cand[target]==[name] for target,name in known.items())
            for e in c['events']:assert e['at']<=c['at'] and (e['vis']['to']=='all' or own(e,c['player']))
            for other in v['players']:assert not {'character','mana','skills','gem','flags'}&other.keys()
            for q in w:
                target=next(z for z in v['players'] if z['id']==q['target']);t['pendingTargetSlots']+=1
                t['deadSlots' if not target['alive'] else 'knownSlots' if q['target'] in known else 'unknownLiveSlots']+=1
            a=c['chosenAction']
            if a:
                actual=o['actions'][c['ordinal']];assert (actual['player'],actual['at'],actual['action'])==(c['player'],c['at'],a)
        for e in p['extra']:
            a=o['actions'][e['ordinal']];t['acceptedExtra']+=e['accepted'];t['extraNominalMana']+=a['nominalMana'] if e['accepted'] else 0;t['extraNetManaDelta']+=e['afterMana']-e['beforeMana'] if e['accepted'] else 0
            c=next(c for c in p['choices'] if c['ordinal']==e['ordinal'] and c['player']==e['actor'] and c['chosenAction']==e['action'])
            assert e['knownBefore']==dict(c['known']).get(e['target'])
            assert all(z['vis']['to']=='all' or own(z,e['actor']) for z in e['ownEvents'])
            if e['knownAfter'] is not None:assert e['knownAfter']==roles[e['target']]
            t['extraKnownBefore']+=e['knownBefore'] is not None;t['extraConfirmed' if e['knownAfter'] is not None else 'extraUnconfirmed']+=1
            q=next(q for q in req if q['actor']==e['actor'] and q['target']==e['target'] and q['ordinal']<e['ordinal'] and e['at']<q['due'])
            delayed=next((z for z in p['receipts'] if z['actor']==q['actor'] and z['event']['kind']=='skill.chaos_hex.result' and z['event']['at']==q['due'] and z['event']['data']['target']==q['target']),None)
            stored=next((z for z in o['decisions'] if z['player']==e['actor'] and z['ordinal']==e['ordinal'] and z['at']==e['at']),None)
            follow=[dict(ordinal=i,at=a['at'],action=a['action']) for i,a in enumerate(o['actions']) if e['knownAfter'] is not None and e['ordinal']<i and a['at']<q['due'] and a['player']==e['actor'] and a['action'].get('target')==e['target'] and a['action'].get('skill') not in CHECKS]
            t['earlyConfirmedFollowupActions']+=len(follow)
            details.append(dict(fixture=o['fixture'],style=o['style'],variant=o['variant'],**e,pendingMsRemaining=q['due']-e['at'],delayedResultSuccess=None if delayed is None else delayed['event']['data']['success'],originalStoredDecision=stored is not None,policyChangedSameMoment=None if stored is None else stored['changed'],sameTargetFollowupBeforeDue=follow))
    assert set(replays)=={k for k,row in rows.items() if row['requests']}
    return dict(kind='round057-independent-summary',newResearchExecutions=0,scannedGames=768,replayedGames=len(replays),matchedActions=sum(p['matchedActions'] for p in replays.values()),knownEntries=known_entries,wrongKnown=0,byVariantMode=totals,extraDetails=details,limitations=d['limitations'])

if __name__=='__main__':
    diag,original,out=sys.argv[1:4];b=read(original);raw=json.loads(b);d=json.loads(read(diag));s=validate(d,raw,b)
    if '--test' in sys.argv:
        def reject(change):
            x=copy.deepcopy(d);change(x)
            try:validate(x,raw,b)
            except (AssertionError,KeyError,IndexError,StopIteration):return
            raise AssertionError('tamper accepted')
        reject(lambda x:x.update(inputSHA256='0'*64))
        reject(lambda x:x['records'].pop())
        reject(lambda x:x['replays'].pop())
        reject(lambda x:x['replays'][0]['receipts'][0]['event'].update(vis={'to':'players','ids':['not-self']}))
        p=next(i for i,r in enumerate(d['replays']) if r['choices'])
        reject(lambda x:x['replays'][p]['choices'][0]['waiting'][0].update(due=0))
        reject(lambda x:x['replays'][p]['choices'][0]['known'].append(['p_unknown','forged']))
        reject(lambda x:x['replays'][p]['choices'][0]['view']['players'][0].update(mana=999))
        reject(lambda x:x['replays'][p].update(matchedActions=0))
        s['independentTests']={'valid':1,'tamperRejected':8}
    pathlib.Path(out).write_text(json.dumps(s,ensure_ascii=False,sort_keys=True,indent=2)+'\n')
    print(json.dumps({k:v for k,v in s.items() if k not in ['extraDetails','limitations']}))
