"""Round050: post-hoc joins, never a policy and never report -> fact promotion."""
import collections
import gzip
import hashlib
import json
import pathlib
import re
import sys

INPUTS = {
    '045': '3660f8ce495e8789e011171ca23ceec9a1f97825e90a1020ba3d1d415ca0e822',
    '047': '5ebe9e06cabb7077f016b43861775db30f4a42d4eab0308f7b99bf4a2654f62f',
    '049': 'b903e1abf4be316d9895c8709eb58c0bc578c209cca5f73ffc5ec60aa93f97e3',
}
def enc(x):
    return json.dumps(x, ensure_ascii=False, separators=(',', ':')).encode()
def sha(b):
    return hashlib.sha256(b).hexdigest()
def read(p):
    b = pathlib.Path(p).read_bytes()
    return gzip.decompress(b) if str(p).endswith('.gz') else b
def fixture_key(r):
    return (r['variant'], enc(r.get('fixture', r.get('result', {}).get('game', {}).get('fixture'))))
def parse_report(view, text):
    m = re.fullmatch(r'확인 정보: \[(\d{1,2})\] (.+)', text)
    if not m:
        return None
    target = next((p['id'] for p in view['players'] if p['seat'] == int(m[1])), None)
    role = next((r['key'] for r in view['roster'] if r['inGame'] and r['name'] == m[2]), None)
    return (target, role) if target and role else None
def message_key(sender, at, action):
    return (sender, at, action.get('channel'), action.get('to'), action.get('text'))
def own_report_state(choice, target):
    """Receiver-only projection. No actual role map or candidates are supplied."""
    view = choice['view']; me = view['me']; known = dict(choice['known'])
    latest = {}
    for e in choice['events']:
        data = e.get('data', {})
        if e['kind'] not in ['chat.whisper', 'chat.ally'] or data.get('from') == me['id']:
            continue
        assert e['vis']['to'] == 'players' and me['id'] in e['vis']['ids']
        parsed = parse_report(view, data.get('text', ''))
        if parsed and parsed[0] == target:
            assert any(p['id'] == data.get('from') for p in view['players'])
            latest[data['from']] = dict(sender=data['from'], character=parsed[1], seq=e['seq'], at=e['at'])
    reports = []
    for sender, report in latest.items():
        role = known.get(sender)
        peer = next(p for p in view['players'] if p['id'] == sender)
        r = next((r for r in view['roster'] if r['key'] == role), None)
        status = ('sender_unconfirmed' if role is None else 'sender_not_own_side' if not r or r['side'] != me['side'] else
                  'sender_dead' if not peer['alive'] else 'confirmed_living_ally_sender')
        reports.append(dict(report, senderKnown=role, senderAlive=peer['alive'], senderStatus=status))
    eligible = [r for r in reports if r['senderStatus'] == 'confirmed_living_ally_sender']
    names = sorted({r['character'] for r in eligible})
    state = ('already_known' if target in known else 'no_received_report' if not reports else
             'no_confirmed_living_ally_sender' if not eligible else 'conflicting_confirmed_ally_reports' if len(names) > 1 else
             'sender_consensus_candidates_unobserved')
    return dict(at=choice['at'], beforeAppliedActions=choice['beforeAppliedActions'], knownTarget=known.get(target),
                state=state, reports=reports, eligibleReportNames=names,
                candidateCompatibility='not_recorded', trustedIntel='not_reconstructed',
                chosenAction=choice['chosenAction'], guardReason=choice['diagnostic']['reason'])
def validate_choices(record, original):
    actions = original['result']['actions']; previous = {}; seen = {}; joins = {}
    assert record['wholeGameAndAllActionsMatched'] and record['originalCollectorMatched']
    assert record['originalRecordSHA256'] == sha(enc(original))
    for d in record['decisions']:
        p = d['player']; view = d['view']; ordinal = d['beforeAppliedActions']
        assert view['me']['id'] == p and view['elapsedMs'] == d['at']
        assert d['memoryUnchanged'] and d['engineUnchanged'] and 0 <= ordinal <= len(actions)
        assert len(dict(d['known'])) == len(d['known'])
        for other in view['players']:
            assert not {'mana', 'skills', 'character', 'extraLives', 'flags'} & set(other)
        if p in previous:
            prev = previous[p]
            assert prev['beforeAppliedActions'] <= ordinal and prev['at'] < d['at']
            assert d['events'][:len(prev['events'])] == prev['events']
        seqs = [e['seq'] for e in d['events']]
        assert seqs == sorted(set(seqs))
        previous[p] = d
        for e in d['events']:
            assert e['at'] <= d['at']
            assert e['vis']['to'] == 'all' or e['vis']['to'] == 'players' and p in e['vis']['ids']
            k = (p, e['seq'])
            assert k not in seen or seen[k] == e
            seen[k] = e
            if e['kind'] != 'chat.whisper':
                continue
            data = e['data']; key = message_key(data['from'], e['at'], data)
            matches = [i for i, a in enumerate(actions) if i < ordinal and a['accepted'] and
                       a['action']['type'] == 'chat' and message_key(a['player'], a['at'], a['action']) == key]
            # Actual bot sends at most one identical whisper per instant; reject ambiguous joins.
            assert len(matches) == 1 and data['to'] != data['from']
            assert set(e['vis']['ids']) == {data['from'], data['to']}
            joins[k] = matches[0]
    return joins
def episode(record, original, guardian, target, cutoff, death_at, joins):
    choices = [d for d in record['decisions'] if d['player'] == guardian and d['beforeAppliedActions'] <= cutoff]
    assert all(death_at is None or d['at'] <= death_at for d in choices)
    # Public seat/name vocabulary, not hidden role assignment, parses the claims.
    view = next(d['view'] for d in record['decisions'] if d['player'] == guardian)
    messages = []
    for i, a in enumerate(original['result']['actions']):
        action = a['action']
        if i >= cutoff or not a['accepted'] or action['type'] != 'chat':
            continue
        parsed = parse_report(view, action.get('text', ''))
        if not parsed or parsed[0] != target:
            continue
        # Corpus sends information as whispers; do not guess ally-channel recipients.
        assert action['channel'] == 'whisper'
        addressed = action.get('to') == guardian
        own_seen = [e for d in choices for e in d['events'] if (guardian, e['seq']) in joins and joins[(guardian, e['seq'])] == i]
        seqs = sorted({e['seq'] for e in own_seen})
        later_choice = any(d['beforeAppliedActions'] > i for d in choices)
        delivery = ('other_recipient' if not addressed else 'observed_own_receipt' if seqs else
                    'no_later_active_choice_censored' if not later_choice else 'missing_receipt_despite_later_choice')
        assert delivery != 'missing_receipt_despite_later_choice', 'saved event/command join incomplete'
        messages.append(dict(actionIndex=i, at=a['at'], sender=a['player'], to=action.get('to'), target=parsed[0],
                             claimedRole=parsed[1], delivery=delivery, ownVisibleEventSeqs=seqs))
    states = [own_report_state(d, target) for d in choices]
    counts = collections.Counter(x['state'] for x in states)
    addressed = [m for m in messages if m['to'] == guardian]
    classification = ('no_report_command' if not messages else 'reported_only_to_others' if not addressed else
                      'addressed_receipt_observed' if any(m['delivery'] == 'observed_own_receipt' for m in addressed) else
                      'addressed_no_later_choice_censored')
    return dict(guardian=guardian, target=target, cutoffActionIndex=cutoff, deathAt=death_at,
                activeChoices=len(choices), classification=classification, stateCounts=counts,
                reportCommands=messages, addressedReportCommands=len(addressed),
                uniqueOwnReceivedReportEvents=len({s for m in addressed for s in m['ownVisibleEventSeqs']}),
                knownTargetChoices=sum(s['knownTarget'] is not None for s in states),
                ownReceivedReportChoices=sum(bool(s['reports']) for s in states), choices=states)
def analyze(wpath, opath, tpath):
    blobs = {'049': read(wpath), '045': read(opath), '047': read(tpath)}
    assert {k: sha(b) for k, b in blobs.items()} == INPUTS
    w, o, t = (json.loads(blobs[k]) for k in ['049', '045', '047'])
    originals = {fixture_key(r): r for r in o['records']}; traces = {fixture_key(r): r for r in t['records']}
    assert len(w['records']) == 4 and w['complete']
    rows = []
    for record in w['records']:
        key = fixture_key(record); original = originals[key]; trace = traces[key]
        joins = validate_choices(record, original)
        roles = {p['character']: p['id'] for p in original['roles']}
        for guard_role, target_role in [('consume', 'eltas'), ('kumarin', 'rael')]:
            # Hidden assignment only chooses external grading episodes; never supplied to own_report_state.
            death = next((d for d in trace['deaths'] if d['character'] == target_role), None)
            cutoff = death['boundary']['actionIndex'] if death else len(original['result']['actions'])
            assert cutoff is not None
            result = episode(record, original, roles[guard_role], roles[target_role], cutoff,
                             death['boundary']['at'] if death else None, joins)
            actual = {p['id']: p['character'] for p in original['roles']}
            # Grade after receiver-only projections, not a truth input or a trusted-report shortcut.
            result['externalGrade'] = dict(guardianRole=guard_role, targetRole=target_role,
                incorrectClaims=sum(m['claimedRole'] != actual[m['target']] for m in result['reportCommands']),
                wrongOwnKnownChoices=sum(s['knownTarget'] is not None and s['knownTarget'] != target_role for s in result['choices']))
            side = {p['id']:p['side'] for p in original['roles']}
            result['externalGrade']['messageRoutes'] = [dict(actionIndex=m['actionIndex'], senderRole=actual[m['sender']],
                recipientRole=actual[m['to']], senderSide=side[m['sender']], recipientSide=side[m['to']],
                senderOnGuardianSide=side[m['sender']]==side[roles[guard_role]]) for m in result['reportCommands']]
            received = [s for s in result['choices'] if s['reports']]
            result['firstKnownTargetAt'] = next((s['at'] for s in result['choices'] if s['knownTarget']), None)
            result['firstOwnReceivedReportChoiceAt'] = received[0]['at'] if received else None
            rows.append(dict(variant=record['variant'], fixture=record['fixture'], **result))
    return dict(kind='guardian-report-path', inputSHA256=INPUTS, optionsSHA256=w['optionsSHA256'],
                analysisSourceSHA256=sha(pathlib.Path(__file__).read_bytes()), newResearchExecutions=0,
                newEngineReplayPasses=0, originalGames=4, episodes=rows,
                limitations=['Death-conditioned selected cases, not independent performance evidence.',
                    'No candidates/intel-memory snapshots: sender consensus is NOT reconstructed trustedIntel or a fact.',
                    'Receiver snapshots end at active choices; no later choice means reception is censored, not failed.',
                    'No sender knowledge/alternative send availability snapshots; no unsent-opportunity denominator.',
                    'Follow-up overlap or confirmation does not prove report causality; synthetic bots only.'])
def summary(d):
    rows = d['episodes']; classes = collections.Counter(r['classification'] for r in rows)
    return dict(kind=d['kind'], inputSHA256=d['inputSHA256'], optionsSHA256=d['optionsSHA256'],
                analysisSourceSHA256=d['analysisSourceSHA256'], newResearchExecutions=0, newEngineReplayPasses=0,
                originalGames=4, episodeCount=len(rows), classifications=classes,
                activeChoices=sum(r['activeChoices'] for r in rows),
                addressedReportCommands=sum(r['addressedReportCommands'] for r in rows),
                uniqueOwnReceivedReportEvents=sum(r['uniqueOwnReceivedReportEvents'] for r in rows),
                ownReceivedReportChoices=sum(r['ownReceivedReportChoices'] for r in rows),
                allReportCommands=sum(len(r['reportCommands']) for r in rows),
                rows=[{k:v for k,v in r.items() if k not in ['choices','reportCommands']} for r in rows],
                limitations=d['limitations'])
if __name__ == '__main__':
    if len(sys.argv) != 6:
        raise SystemExit('witness049.gz original045.gz deaths047.gz output.json.gz summary.json')
    result = analyze(*sys.argv[1:4]); blob = enc(result) + b'\n'
    pathlib.Path(sys.argv[4]).write_bytes(gzip.compress(blob, mtime=0))
    s = summary(result); s['decodedSHA256'] = sha(blob)
    pathlib.Path(sys.argv[5]).write_text(json.dumps(s, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k:v for k,v in s.items() if k not in ['rows','limitations']}, ensure_ascii=False))
