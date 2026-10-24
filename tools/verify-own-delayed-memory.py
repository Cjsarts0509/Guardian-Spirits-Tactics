"""Round058 independent structural/evidence audit; does not reimplement the engine or TS policy."""
import copy
import gzip
import hashlib
import json
from pathlib import Path
import sys


def packed(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode()


def sha(value):
    return hashlib.sha256(value).hexdigest()


def read(path):
    raw = Path(path).read_bytes()
    return gzip.decompress(raw) if str(path).endswith('.gz') else raw


def verify(data, source):
    assert data['kind'] == 'round058-own-delayed-memory-and-host-audit'
    assert data['newResearchExecutions'] == data['newResearchSeeds'] == data['productionSourceChanges'] == 0
    assert data['inputSHA256'] == sha(source)
    original = json.loads(source)
    assert len(original['replays']) == len(data['observations']) == 96
    c = data['collision']
    assert c['targets'][0] != c['targets'][1]
    assert c['memories'][0] == c['memories'][1]
    assert c['ownViews'][0] == c['ownViews'][1]
    assert c['incrementalNextEvents'] == 0 and c['cooldownRemainingMs'] == 70000
    for i in range(2):
        e = c['ownReceipts'][i][0]
        assert e['kind'] == 'skill.chaos_hex.self' and e['at'] == 1000
        assert e['data']['target'] == c['targets'][i]
        assert e['vis'] == {'to': 'players', 'ids': [c['ownViews'][i]['me']['id']]}
        assert c['eventDerivedPending'][i] == [{'target': c['targets'][i], 'at': 1000, 'due': 61000, 'receiptSeq': e['seq']}]
    expected = {'success': True, 'failure': False, 'actor-left': True, 'target-left': True,
                'end-before-due': None, 'rejected': None}
    assert {x['kind'] for x in data['cases']} == set(expected)
    checkpoints = 0
    for case in data['cases']:
        outcome = expected[case['kind']]
        assert len(case['receipts']) == (0 if case['kind'] == 'rejected' else 1)
        assert len(case['results']) == (0 if outcome is None else 1)
        if outcome is not None:
            event = case['results'][0]
            assert event['at'] == 61000 and event['data']['target'] == case['target']
            assert event['data']['success'] == outcome
            assert event['vis'] == {'to': 'players', 'ids': [case['actor']]}
            if outcome:
                assert event['facts'] == [{'player': case['target'], 'character': case['targetRole']}]
                assert case['finalKnown'] == case['targetRole']
            else:
                assert not event.get('facts')
        assert case['otherPrivateReceipts'] == 0
        assert len(case['checkpoints']) == 5
        for point in case['checkpoints']:
            checkpoints += 1
            for flag in ['fullRestoreEqual', 'deltaRestoreEqual', 'nextActionAndRngEqual', 'observerUnchanged']:
                assert point[flag] is True
            for event in point['input']['events']:
                assert event['at'] <= point['input']['view']['elapsedMs']
                assert event['vis']['to'] == 'all' or (event['vis']['to'] == 'players' and case['actor'] in event['vis']['ids'])
                if event['kind'] == 'skill.chaos_hex.result':
                    assert point['at'] >= 61000
    observations = 0
    per_variant = {}
    for record, old in zip(data['observations'], original['replays']):
        for key in ['fixture', 'style', 'variant']:
            assert record[key] == old[key]
        assert len(record['rows']) == len(old['choices'])
        for row, prior in zip(record['rows'], old['choices']):
            observations += 1
            per_variant[record['variant']] = per_variant.get(record['variant'], 0) + 1
            assert row['ownInputSHA256'] == sha(packed({'view': prior['view'], 'events': prior['events']}))
            assert row['at'] == prior['view']['elapsedMs'] and row['player'] == prior['view']['me']['id']
            assert row['pending'] == prior['waiting']
            assert row['rewrites'] == len(prior['waiting']) > 0
            assert row['knownCount'] == len(prior['known'])
            assert row['knowledgeRebuilt'] is True and row['receiptTargetSensitivity'] is False
    assert per_variant == {'control': 414, 'candidate': 415}
    assert len(data['traces']) == 3
    assert all(t['ticks'] == len(t['rows']) == 9 for t in data['traces'])
    assert all(any(r['usedMemoryDelta'] for r in t['rows']) for t in data['traces'])
    assert all(r['fullAndDeltaEqual'] for t in data['traces'] for r in t['rows'])
    assert data['summary'] == {'scenarios': 6, 'checkpoints': checkpoints, 'restoredCheckpoints': 30,
        'actualHostTicks': 27, 'storedGames': 96, 'storedOwnInputObservations': observations,
        'reconstructedKnowledgeMatches': 829, 'receiptTargetInsensitive': 829,
        'successFactRetained': 3, 'resultCases': 4, 'hostDivergences': 0}
    return {'valid': True, **data['summary'], 'perVariantStoredObservations': per_variant,
            'scope': 'Cross-file counts, own-event evidence, collision payloads, and asserted runtime checks; not an independent engine.'}


def main():
    raw, source = read(sys.argv[1]), read(sys.argv[2])
    data = json.loads(raw)
    summary = verify(data, source)
    if '--test' in sys.argv[3:]:
        changes = [
            lambda d: d.update(newResearchExecutions=1),
            lambda d: d.update(inputSHA256='bad'),
            lambda d: d['collision']['memories'][1].update(wrong=True),
            lambda d: d['collision']['ownReceipts'][0][0]['data'].update(target='wrong'),
            lambda d: d['cases'][0]['results'][0].update(at=1000),
            lambda d: d['cases'][0]['results'][0]['vis'].update(ids=['foreign']),
            lambda d: next(r for r in d['observations'] if r['rows'])['rows'][0].update(ownInputSHA256='wrong'),
            lambda d: d['summary'].update(hostDivergences=1),
        ]
        for change in changes:
            bad = copy.deepcopy(data)
            change(bad)
            try:
                verify(bad, source)
            except AssertionError:
                continue
            raise AssertionError('Tampered evidence was accepted')
        summary['tamperRejected'] = len(changes)
    if len(sys.argv)>3 and sys.argv[3] != '--test':
        Path(sys.argv[3]).write_text(json.dumps(summary, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == '__main__':
    main()
