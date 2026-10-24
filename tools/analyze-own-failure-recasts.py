"""Post-choice audit of recasts after an actually consumed own chaos failure.

Run only on complete, independently verified062/063 records. A repeated false
identity check may have other tactical effects; this is not an optimality gate.
"""
import collections,gzip,hashlib,json,pathlib,sys

def consumed_before(episode,at):
    seen=episode['firstResultSeen']
    # The primary action executes before that actor's chat call at the same tick.
    return bool(seen and (seen['at']<at or seen['at']==at and seen['stage']=='primary'))

def analyze(data):
    identical=data['kind']=='own-failure-faction-identical-policy'
    assert data['kind'] in ['own-failure-faction-development','own-failure-faction-identical-policy']
    assert data['complete'] and data['executions']==len(data['records'])==data['count']*(24 if identical else 144)
    groups={};witnesses=[];censored=[]
    for row in data['records']:
        if row['variant']=='baseline':continue  # No actual passive-ledger intake observability in baseline.
        group=groups.setdefault(row['variant'],collections.Counter())
        group['games']+=1;group['unfinished']+=row['game']['winner'] is None
        episodes=row['episodes'];actions=[(i,a) for i,a in enumerate(row['actions']) if a['accepted'] and a['action']['type']=='skill' and a['action']['skill']=='chaos_hex' and (identical or a['side']==row['fixture']['currentSide'])]
        assert len(actions)==len(episodes)
        failures=[e for e in episodes if e['firstResultSeen'] and e['firstResultSeen']['record']['status']=='failed']
        group['consumedFailures']+=len(failures);group['gamesWithConsumedFailure']+=bool(failures)
        group['consumedFailureActorTargetPairs']+=len({(e['actor'],e['receipt']['data']['target']) for e in failures})
        recast_targets=set();recast_here=0
        for ordinal,a in actions:
            target=a['action']['target'];matches=[e for e in episodes if e['actor']==a['player'] and e['receipt']['at']==a['at'] and e['receipt']['data']['target']==target]
            assert len(matches)==1;current=matches[0]
            group['acceptedChaosRequests']+=1;group['acceptedChaosNominalMana']+=a['nominalMana']
            prior=[e for e in episodes if e['actor']==a['player'] and e['receipt']['data']['target']==target and e['receipt']['seq']<current['receipt']['seq'] and e['result'] and e['result']['data']['success'] is False]
            eligible=[e for e in prior if consumed_before(e,a['at'])]
            if not eligible:
                if any(e['result']['at']<=a['at'] for e in prior):
                    group['priorFailureEmittedNotConsumedBeforeChoice']+=1
                    censored.append({'fixture':row['fixture'],'style':row['style'],'variant':row['variant'],'ordinal':ordinal,'actor':a['player'],'target':target,'at':a['at']})
                continue
            first=min(eligible,key=lambda e:(e['firstResultSeen']['at'],e['receipt']['seq']))
            assert first['firstResultSeen']['record']['status']=='failed' and first['result']['data']['success'] is False
            assert first['result']['at']<=first['firstResultSeen']['at']<=a['at']
            role=next(r for r in row['roles'] if r['id']==target);assert role['side']==1  # External grading after actual choice.
            outcome='unresolved' if current['result'] is None else 'failed' if current['result']['data']['success'] is False else 'unexpected-success'
            group['recastsAfterConsumedFailure']+=1;group['recastNominalMana']+=a['nominalMana'];group['recastImmediateManaDelta']+=a['afterMana']-a['beforeMana'];group['recastResult/'+outcome]+=1
            group['sameTickPrimaryIntakeThenRecast']+=first['firstResultSeen']['at']==a['at']
            recast_here+=1;recast_targets.add((a['player'],target))
            witnesses.append({'fixture':row['fixture'],'style':row['style'],'variant':row['variant'],'ordinal':ordinal,'actor':a['player'],'target':target,'at':a['at'],'nominalMana':a['nominalMana'],'beforeMana':a['beforeMana'],'afterMana':a['afterMana'],'priorOwnReceipt':first['receipt'],'priorOwnResult':first['result'],'priorActualIntake':first['firstResultSeen'],'currentOwnReceipt':current['receipt'],'currentOwnResult':current['result'],'outcome':outcome})
        group['gamesWithRecast']+=bool(recast_here);group['recastActorTargetPairs']+=len(recast_targets)
    return {'kind':'own-consumed-chaos-failure-recasts','sourceRef':data['sourceRef'],'dataKind':data['kind'],'executions':data['executions'],'newResearchExecutions':0,'variants':groups,'witnesses':witnesses,'emittedButUnconsumedCases':censored,'limitations':[
        'Control/candidate actual own-ledger intake only. Baseline has no equivalent intake observation and is not assigned a zero rate.',
        'A failed same-target chaos result supplies no new identity outcome under the unchanged public rule, but retargeting the shared purify-hex condition may have tactical effects.',
        'These are actual trajectory counts with different game lengths and future opportunities; request-frequency differences are not a causal mana saving or win estimate.',
        'Same-tick primary consumption precedes the command; same-tick chat consumption follows it and is excluded.',
        'Repeated actor-targets are deduplicated within a game, not across seed/order/style exchanges. No blanket suppression of pending checks is proposed.',
    ]}

if __name__=='__main__':
    p=pathlib.Path(sys.argv[1]);raw=p.read_bytes();raw=gzip.decompress(raw) if str(p).endswith('.gz') else raw
    result=analyze(json.loads(raw));result.update(rawSHA256=hashlib.sha256(raw).hexdigest(),analysisSHA256=hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest())
    pathlib.Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'variants':result['variants'],'newResearchExecutions':0},ensure_ascii=False))
