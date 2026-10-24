"""Post-choice round062 diagnostics. Never changes policy inputs, options or samples.

Run only after verify-failure-development.py has checked the source and publication.
Counts of linked followups establish temporal use, not a causal contribution to wins.
"""
import collections, gzip, hashlib, json, pathlib, sys

def read(path):
    data = pathlib.Path(path).read_bytes()
    return gzip.decompress(data) if str(path).endswith('.gz') else data

def fixture_key(row):
    f = row['fixture']
    return (f['mode'], row['style'], f['seed'], f['reversed'], f['currentSide'])

def action_kind(action):
    return 'none' if action is None else action.get('skill', action['type'])

def action_signature(action):
    return {k: action[k] for k in ['player', 'at', 'stage', 'action', 'accepted', 'error']}

def analyze(data):
    assert data['complete'] and data['executions'] == data['count'] * 144
    rows = data['records']
    groups = {}
    pairs = {}
    for row in rows:
        key = fixture_key(row)
        pairs[key, row['variant']] = row
        out = groups.setdefault(row['variant'], {
            'games': 0, 'failedResultConsumption': 0, 'eligible': 0, 'reduced': 0,
            'newExactObservations': 0, 'newExactActorTargetWithinGame': set(),
            'removedRoleObservations': 0, 'choiceChanges': collections.Counter(),
            'actualLinkedFollowups': collections.Counter(),
            'actualNewExactFollowups': collections.Counter(),
            'acceptedReports': collections.Counter(), 'reportRecipients': collections.Counter(),
            'gamesWithFailures': 0, 'gamesWithEligible': 0,
            'gamesWithLinkedFollowup': 0, 'gamesWithNewExactFollowup': 0,
        })
        out['games'] += 1
        out['failedResultConsumption'] += row['counters']['firstFailures']
        out['eligible'] += row['counters']['eligible']
        out['reduced'] += row['counters']['reduced']
        out['gamesWithFailures'] += bool(row['probes'])
        out['gamesWithEligible'] += bool(row['counters']['eligible'])
        for probe in row['probes']:
            out['newExactObservations'] += len(probe['newExact'])
            for target, name in probe['newExact']:
                out['newExactActorTargetWithinGame'].add((key, probe['actor'], target, name))
            out['removedRoleObservations'] += sum(len(x['removed']) for x in probe['removals'])
            if probe['changed']:
                out['choiceChanges'][action_kind(probe['offAction']) + ' -> ' + action_kind(probe['onAction'])] += 1
        links = collections.defaultdict(list)
        for follow in row['followups']:
            links[follow['ordinal']].append(follow)
        linked_new = 0
        for ordinal, follows in links.items():
            action = row['actions'][ordinal]
            assert all(f['action'] == action['action'] and f['actor'] == action['player'] for f in follows)
            known = any(f['knownName'] is not None for f in follows)
            new_exact = any([f['target'], f['knownName']] in row['probes'][f['probe']]['newExact'] for f in follows)
            kind = follows[0]['kind']
            label = kind + '/' + ('known' if known else 'unknown') + '/' + ('accepted' if action['accepted'] else 'rejected')
            out['actualLinkedFollowups'][label] += 1
            if new_exact:
                out['actualNewExactFollowups'][label] += 1
                linked_new += 1
        out['gamesWithLinkedFollowup'] += bool(links)
        out['gamesWithNewExactFollowup'] += bool(linked_new)
        roles = {r['id']: r for r in row['roles']}
        for action in row['actions']:
            if action['side'] != row['fixture']['currentSide'] or not action['accepted'] or not action['reportTarget']:
                continue
            out['acceptedReports']['total'] += 1
            out['acceptedReports']['wrongName'] += action['reportedName'] != action['reportActual']
            out['acceptedReports']['notSupportedByOwnWorkingKnowledge'] += action['reportedName'] != action['reportKnown']
            recipient = action['action'].get('to')
            out['reportRecipients']['sameFaction' if recipient in roles and roles[recipient]['side'] == action['side'] else 'otherFactionOrPublic'] += 1
    divergences = []
    for (key, variant), candidate in pairs.items():
        if variant != 'candidate':
            continue
        control = pairs[key, 'control']
        ca, co = candidate['actions'], control['actions']
        index = next((i for i, (a, b) in enumerate(zip(ca, co)) if action_signature(a) != action_signature(b)), min(len(ca), len(co)))
        different = index < max(len(ca), len(co))
        if different:
            divergences.append({
                'fixture': candidate['fixture'], 'style': candidate['style'], 'sharedCommandPrefix': index,
                'controlFirst': action_signature(co[index]) if index < len(co) else None,
                'candidateFirst': action_signature(ca[index]) if index < len(ca) else None,
                'controlWinner': control['game']['winner'], 'candidateWinner': candidate['game']['winner'],
                'controlNominalMana': control['resources']['nominalSkillMana'],
                'candidateNominalMana': candidate['resources']['nominalSkillMana'],
            })
    for value in groups.values():
        value['newExactActorTargetWithinGame'] = len(value['newExactActorTargetWithinGame'])
    return {
        'kind': 'round062-post-choice-diagnostics', 'sourceRef': data['sourceRef'],
        'executions': data['executions'], 'newExecutions': 0, 'variants': groups,
        'controlCandidateCommandDivergences': divergences,
        'limitations': [
            'OFF/ON clones are local counterfactual choices; actual followups are from the assigned whole-match policy.',
            'New-exact actor/target counts deduplicate within a game, not across seed/style/order exchanges.',
            'Followups are associated with prior evidence; association alone is not win causality.',
            'Accepted whispers establish an engine-accepted message, not recipient belief or later use.',
            'Recipient faction is external scoring after the message choice, never a policy input.',
        ],
    }

if __name__ == '__main__':
    raw = read(sys.argv[1]); result = analyze(json.loads(raw))
    result['rawSHA256'] = hashlib.sha256(raw).hexdigest()
    result['analysisSHA256'] = hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()
    pathlib.Path(sys.argv[2]).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'executions': result['executions'], 'divergentPairs': len(result['controlCandidateCommandDivergences']), 'newExecutions': 0}))
