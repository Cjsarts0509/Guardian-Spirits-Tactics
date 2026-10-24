"""Independent audit of pinned-main matches, own-input grades and seed-block summaries."""
import collections
import copy
import gzip
import hashlib
import json
import pathlib
import random
import statistics
import sys

MODES = ['civil_war', 'primordial', 'lidellut', 'troll']
sha = lambda b: hashlib.sha256(b).hexdigest()
key = lambda f: (f['mode'], f['seed'], f['count'], f['reversed'], f['currentSide'])

def verify_worker(snapshot, journal, publication, plan, expected_count=25):
    data = json.loads(snapshot)
    pub = json.loads(publication)
    lines = journal.decode().splitlines()
    header = json.loads(lines[0])
    assert pub['complete'] is data['complete'] is True
    assert pub['executions'] == data['executions'] == expected_count
    assert sha(snapshot) == pub['snapshotSHA256']
    assert sha(journal) == pub['journalSHA256'] == data['journalSha256']
    assert pub['fingerprint'] == data['fingerprint'] == header['fingerprint']
    assert sha(json.dumps(header['meta'], ensure_ascii=False, separators=(',', ':')).encode()) == data['fingerprint']
    assert data['records'] == [json.loads(x) for x in lines[1:]]
    assert data['candidateRef'] == plan['candidateRef'] and data['mainRef'] == plan['mainRef']
    assert data['settings'] == plan['settings'] and data['candidateOptions'] == plan['candidateOptions']
    expected = plan['fixtures'] if expected_count == 100 else [f for f in plan['fixtures'] if f['mode'] == data['mode']]
    assert [key(r['fixture']) for r in data['records']] == [key(f) for f in expected]
    assert len(set(key(r['fixture']) for r in data['records'])) == expected_count
    for row in data['records']:
        verify_game(row, plan['settings'])
    return data

def verify_game(row, settings):
    roles = {p['id']: p for p in row['survivors']}
    policy = lambda actor: 'candidate' if roles[actor]['side'] == row['fixture']['currentSide'] else 'main'
    assert len(roles) == row['fixture']['count']
    assert all(p['policy'] == policy(p['id']) for p in row['survivors'])
    expected = None if row['winner'] is None else 'candidate' if row['winner'] == row['fixture']['currentSide'] else 'main'
    assert row['winnerPolicy'] == expected
    assert row['elapsedMs'] <= settings['limitMs']
    if expected is None:
        assert row['elapsedMs'] == settings['limitMs']
    fields = ['attempted', 'accepted', 'rejected', 'skillMana', 'immediateManaDelta', 'attackFailures',
              'reports', 'wrongReportNames', 'unsupportedReports', 'reportToUnknownOrEnemy', 'knownChecks',
              'wrongKnown', 'candidateChecks', 'truthExcluded', 'acceptedAllies', 'enemyAllies',
              'knownEnemyAllies', 'delayedReceipts', 'failedResultsConsumed']
    computed = {p: dict.fromkeys(fields, 0) for p in ['candidate', 'main']}
    skills = {p: collections.Counter() for p in computed}
    for ordinal, action in enumerate(row['actions']):
        assert ordinal == action['ordinal'] and action['policy'] == policy(action['actor'])
        view = action['ownView']
        assert view['me']['id'] == action['actor'] and view['elapsedMs'] == action['at']
        assert view['me']['character'] == roles[action['actor']]['character']
        assert all('character' not in player for player in view['players'])
        assert view['me']['mana'] == action['beforeMana']
        c = computed[action['policy']]
        c['attempted'] += 1
        c['accepted' if action['accepted'] else 'rejected'] += 1
        a = action['action']
        if action['accepted'] and a['type'] == 'skill':
            c['skillMana'] += action['nominalMana']
            c['immediateManaDelta'] += action['afterMana'] - action['beforeMana']
            skills[action['policy']][a['skill']] += 1
        c['attackFailures'] += int('attack.fail.self' in action['receiptKinds'])
        c['delayedReceipts'] += action['receiptKinds'].count('skill.chaos_hex.self')
        known = dict(action['ownKnown'] or [])
        target = action['reportTarget']
        if action['accepted'] and a['type'] == 'chat' and a['text'].startswith('확인 정보: '):
            c['reports'] += 1
            c['wrongReportNames'] += int(target not in roles or roles[target]['character'] != action['reportedName'])
            c['unsupportedReports'] += int(not target or known.get(target) != action['reportedName'])
            sender_known = known.get(a.get('to'))
            sender_role = next((r for r in view['roster'] if r['key'] == sender_known), None)
            c['reportToUnknownOrEnemy'] += int(not sender_role or sender_role['side'] != view['me']['side'])
        if action['accepted'] and a['type'] == 'skill' and a['skill'] == 'ally':
            enemy = roles[a['target']]['side'] != roles[action['actor']]['side']
            c['acceptedAllies'] += 1
            c['enemyAllies'] += int(enemy)
            c['knownEnemyAllies'] += int(enemy and a['target'] in known)
    failed = {p: set() for p in computed}
    for audit in row['knowledgeAudits']:
        assert audit['policy'] == policy(audit['actor'])
        c = computed[audit['policy']]
        for target, name in audit['known']:
            c['knownChecks'] += 1
            c['wrongKnown'] += int(roles[target]['character'] != name)
        for target, names in audit['candidates']:
            c['candidateChecks'] += 1
            c['truthExcluded'] += int(roles[target]['character'] not in names)
        failed[audit['policy']].update((audit['actor'], seq) for seq in audit['failedReceiptSeqs'])
    for p, values in computed.items():
        values['failedResultsConsumed'] = len(failed[p])
        for field, value in values.items():
            assert row['stats'][p][field] == value, (row['fixture'], p, field, row['stats'][p][field], value)
        assert dict(skills[p]) == row['stats'][p]['skills']

def bucket(rows):
    return {'games': len(rows), 'candidateWins': sum(r['winnerPolicy'] == 'candidate' for r in rows),
            'mainWins': sum(r['winnerPolicy'] == 'main' for r in rows),
            'unfinished': sum(r['winnerPolicy'] is None for r in rows)}

def interval(rows, resamples=10000):
    # Resample seeds, stratifying by mode and complete exchange/singleton blocks.
    grouped = collections.defaultdict(list)
    for row in rows:
        grouped[(row['fixture']['mode'], row['fixture']['seed'])].append(row)
    strata = collections.defaultdict(list)
    for (mode, seed), block in grouped.items():
        assert len(block) in (1, 4)
        strata[(mode, len(block))].append(block)
    rng = random.Random(740100)
    means = []
    for _ in range(resamples):
        selected = [game for blocks in strata.values() for _ in blocks for game in rng.choice(blocks)]
        means.append(sum(1 if g['winnerPolicy'] == 'candidate' else .5 if g['winnerPolicy'] is None else 0 for g in selected) / len(selected))
    means.sort()
    return [means[int(resamples * .025)], means[min(resamples - 1, int(resamples * .975))]]

def summarize(rows):
    groups = collections.defaultdict(list)
    for row in rows:
        groups[(row['fixture']['mode'], row['fixture']['seed'])].append(row)
    result = bucket(rows)
    result['independentSeeds'] = len(groups)
    result['candidateScore95'] = interval(rows)
    result['completeExchange'] = bucket([r for block in groups.values() if len(block) == 4 for r in block])
    result['singletonExtras'] = bucket([r for block in groups.values() if len(block) == 1 for r in block])
    result['byMode'] = {}
    for mode in MODES:
        subset = [r for r in rows if r['fixture']['mode'] == mode]
        result['byMode'][mode] = {**bucket(subset), 'candidateScore95': interval(subset),
            'byCandidateSide': {str(side): bucket([r for r in subset if r['fixture']['currentSide'] == side]) for side in (1, 2)},
            'byOrder': {str(order): bucket([r for r in subset if r['fixture']['reversed'] is order]) for order in (False, True)},
            'byCount': {str(count): bucket([r for r in subset if r['fixture']['count'] == count]) for count in range(8, 13)}}
    result['byPolicy'] = {}
    for policy in ['candidate', 'main']:
        total = collections.Counter()
        skills = collections.Counter()
        for r in rows:
            total.update({k: v for k, v in r['stats'][policy].items() if isinstance(v, (int, float))})
            skills.update(r['stats'][policy]['skills'])
        result['byPolicy'][policy] = {**dict(total), 'skills': dict(skills)}
    result['minutes'] = {'median': statistics.median(r['elapsedMs'] / 60000 for r in rows), 'max': max(r['elapsedMs'] / 60000 for r in rows)}
    return result

if __name__ == '__main__':
    if sys.argv[1] == '--primary':
        read = lambda p: gzip.decompress(pathlib.Path(p).read_bytes()) if p.endswith('.gz') else pathlib.Path(p).read_bytes()
        plan = json.loads(read(sys.argv[5]))
        data = verify_worker(read(sys.argv[2]), read(sys.argv[3]), read(sys.argv[4]), plan, 100)
        result = {'kind': 'round074-independent-primary-audit', 'newResearchExecutions': 0, 'humanMatches': 0,
                  'primarySHA256': sha(read(sys.argv[2])), 'planSHA256': sha(read(sys.argv[5])),
                  'verifierSHA256': sha(pathlib.Path(__file__).read_bytes()), **summarize(data['records'])}
        pathlib.Path(sys.argv[6]).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
        print(json.dumps({k: result[k] for k in ['games', 'candidateWins', 'mainWins', 'unfinished', 'candidateScore95']}))
        sys.exit(0)
    plan = json.loads(pathlib.Path(sys.argv[1]).read_bytes())
    directory = pathlib.Path(sys.argv[2])
    workers = {}
    records = []
    for mode in MODES:
        base = directory / ('gst074-' + mode)
        snapshot = base.with_suffix('.json').read_bytes()
        journal = pathlib.Path(str(base) + '.journal.ndjson').read_bytes()
        publication = pathlib.Path(str(base) + '.publication.json').read_bytes()
        data = verify_worker(snapshot, journal, publication, plan)
        workers[mode] = {'snapshotSHA256': sha(snapshot), 'journalSHA256': sha(journal), 'publicationSHA256': sha(publication), 'fingerprint': data['fingerprint']}
        records.extend(data['records'])
    assert len(records) == 100 and len(set(key(r['fixture']) for r in records)) == 100
    assert [key(r['fixture']) for r in records] == [key(f) for f in plan['fixtures']]
    result = {'kind': 'round074-independent-main-comparison-audit', 'newResearchExecutions': 100, 'humanMatches': 0,
              'planSHA256': sha(pathlib.Path(sys.argv[1]).read_bytes()), 'verifierSHA256': sha(pathlib.Path(__file__).read_bytes()),
              'candidateRef': plan['candidateRef'], 'mainRef': plan['mainRef'], 'workers': workers, **summarize(records)}
    pathlib.Path(sys.argv[3]).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: result[k] for k in ['games', 'candidateWins', 'mainWins', 'unfinished', 'independentSeeds', 'candidateScore95']}))
