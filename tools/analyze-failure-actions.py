"""Actual first choices and later uses after own failed chaos evidence.

Run after the appropriate independent development/selfplay verifier. This is a
post-choice classification, not a policy input or a counterfactual win estimate.
"""
import collections
import gzip
import hashlib
import json
import pathlib
import sys


def analyze_records(rows, identical=False):
    groups = {}
    witnesses = []
    for row in rows:
        group = groups.setdefault(row['variant'], {
            'games': 0, 'probeMoments': 0, 'firstChoices': collections.Counter(),
            'firstChoiceTarget': collections.Counter(), 'linkedActualActions': collections.Counter(),
            'candidateNewExactActualUses': collections.Counter(),
            'candidateNewExactActorTargetsUsed': 0, 'candidateNewExactActorTargetsAvailable': 0,
            'candidateNewExactUsesByMode': collections.Counter(),
            'newExactLatencyMs': [], 'acceptedReports': collections.Counter(),
        })
        group['games'] += 1
        roles = {r['id']: r for r in row['roles']}
        actions = row['actions']
        links = collections.defaultdict(list)
        new_exact_targets = {}
        for index, probe in enumerate(row['probes']):
            group['probeMoments'] += 1
            actual_known = dict(probe['newKnown'] if row['variant'] == 'candidate' else probe['oldKnown'])
            if row['variant'] == 'candidate':
                for target, name in probe['newExact']:
                    assert roles[target]['character'] == name
                    new_exact_targets.setdefault((probe['actor'], target, name), probe['at'])
            chosen = probe['chosenAction']
            if chosen is None:
                group['firstChoices']['none'] += 1
                continue
            action = actions[probe['ordinal']]
            assert action['action'] == chosen and action['player'] == probe['actor'] and action['at'] == probe['at']
            kind = chosen.get('skill', chosen['type'])
            group['firstChoices'][kind + '/' + ('accepted' if action['accepted'] else 'rejected')] += 1
            target = chosen.get('target') if chosen['type'] == 'skill' else action['reportTarget']
            if target is not None:
                known = actual_known.get(target)
                if known is not None:
                    assert roles[target]['character'] == known
                relation = 'sameFaction' if roles[target]['side'] == action['side'] else 'otherFaction'
                group['firstChoiceTarget'][kind + '/' + relation + '/' + ('exactKnown' if known else 'notExactKnown')] += 1
                links[probe['ordinal']].append({'probe': index, 'phase': 'immediate', 'target': target, 'knownName': known})
        for follow in row['followups']:
            links[follow['ordinal']].append({**follow, 'phase': 'later'})
        used = set()
        for ordinal, evidence in sorted(links.items()):
            action = actions[ordinal]
            target = action['action'].get('target') if action['action']['type'] == 'skill' else action['reportTarget']
            assert all(e['target'] == target for e in evidence)
            kind = action['action'].get('skill', action['action']['type'])
            accepted = 'accepted' if action['accepted'] else 'rejected'
            # A later failure may coincide with an action already linked to an
            # earlier failure. The actual command is counted once in this union.
            group['linkedActualActions'][kind + '/' + accepted] += 1
            key = (action['player'], target, roles[target]['character'])
            valid = [e for e in evidence if e['knownName'] is not None and
                     [target, e['knownName']] in row['probes'][e['probe']]['newExact']]
            if row['variant'] != 'candidate' or not valid:
                continue
            assert key in new_exact_targets
            first_at = new_exact_targets[key]
            assert action['at'] >= first_at
            group['candidateNewExactActualUses'][kind + '/' + accepted] += 1
            group['candidateNewExactUsesByMode'][row['fixture']['mode']] += 1
            if key not in used:
                group['newExactLatencyMs'].append(action['at'] - first_at)
                used.add(key)
            witnesses.append({
                'fixture': row['fixture'], 'style': row['style'], 'variant': row['variant'],
                'ordinal': ordinal, 'actor': action['player'], 'target': target,
                'firstNewExactAt': first_at, 'actionAt': action['at'], 'action': action['action'],
                'accepted': action['accepted'], 'phases': sorted({e['phase'] for e in valid}),
                'probes': sorted({e['probe'] for e in valid}),
            })
        group['candidateNewExactActorTargetsAvailable'] += len(new_exact_targets)
        group['candidateNewExactActorTargetsUsed'] += len(used)
        for action in actions:
            if not identical and action['side'] != row['fixture']['currentSide']:
                continue
            if not action['accepted'] or not action['reportTarget']:
                continue
            report = group['acceptedReports']
            report['total'] += 1
            report['wrongName'] += action['reportedName'] != action['reportActual']
            report['unsupportedByOwnWorkingKnowledge'] += action['reportedName'] != action['reportKnown']
            recipient = action['action'].get('to')
            report['sameFactionRecipient' if recipient in roles and roles[recipient]['side'] == action['side'] else 'otherFactionOrPublicRecipient'] += 1
    for group in groups.values():
        assert sum(group['firstChoices'].values()) == group['probeMoments']
        assert group['candidateNewExactActorTargetsUsed'] <= group['candidateNewExactActorTargetsAvailable']
    return {
        'variants': groups, 'candidateActualUseWitnesses': witnesses,
        'limitations': [
            'Only candidate new-exact differences are actual inference-enabled knowledge; control clone differences are not counted as learned.',
            'First choices and later links are deduplicated by actual command ordinal within each game.',
            'An available new exact identity is not necessarily an eligible action opportunity: death, cooldown, cost and higher priority remain unmeasured here.',
            'Actor-target counts deduplicate within a game, not across seed/order/style exchanges.',
            'Known-name use and accepted reports do not establish recipient belief, recipient action or a causal contribution to victory.',
            'Role/faction classifications are external scoring after the actual command choice.',
        ],
    }


def analyze(data):
    assert data['complete']
    assert data['kind'] in ['own-failure-faction-development', 'own-failure-faction-identical-policy']
    identical = data['kind'] == 'own-failure-faction-identical-policy'
    assert data['executions'] == len(data['records']) == data['count'] * (24 if identical else 144)
    return {
        'kind': 'own-failure-actual-action-links', 'dataKind': data['kind'],
        'sourceRef': data['sourceRef'], 'executions': data['executions'], 'newExecutions': 0,
        **analyze_records(data['records'], identical),
    }


if __name__ == '__main__':
    path = pathlib.Path(sys.argv[1]); raw = path.read_bytes()
    if str(path).endswith('.gz'):
        raw = gzip.decompress(raw)
    result = analyze(json.loads(raw))
    result['rawSHA256'] = hashlib.sha256(raw).hexdigest()
    result['analysisSHA256'] = hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()
    pathlib.Path(sys.argv[2]).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'executions': result['executions'], 'actualUseWitnesses': len(result['candidateActualUseWitnesses']), 'newExecutions': 0}))
