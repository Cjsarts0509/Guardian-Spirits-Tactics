"""Post-verification common-prefix audit for fixed-opponent or identical-policy runs."""
import gzip
import hashlib
import json
import pathlib
import sys


def audit(data):
    assert data['complete']
    identical = data['kind'] == 'own-failure-faction-identical-policy'
    assert identical or data['kind'] == 'own-failure-faction-development'
    assert data['executions'] == len(data['records']) == data['count'] * (24 if identical else 144)
    key = lambda r: (r['fixture']['mode'], r['style'], r['fixture']['seed'], r['fixture']['reversed'], r['fixture']['currentSide'])
    pairs = {(key(r), r['variant']): r for r in data['records']}
    assert len(pairs) == len(data['records'])
    counts = {'pairs': 0, 'noFailureFullEqual': 0, 'firstFailureOwnInputsEqual': 0,
              'firstCommandChangeAfterEvidence': 0, 'failureButCommandsUnchanged': 0}
    rows = []
    signature = lambda a: tuple(a[k] for k in ['player', 'at', 'stage', 'action', 'accepted', 'error'])
    for (fixture, variant), candidate in pairs.items():
        if variant != 'candidate':
            continue
        control = pairs[fixture, 'control']
        counts['pairs'] += 1
        assert bool(candidate['probes']) == bool(control['probes'])
        if not candidate['probes']:
            fields = ['game', 'actions', 'resources', 'memoryTraceSHA256'] + (['resourcesBySide'] if identical else [])
            assert all(candidate[k] == control[k] for k in fields)
            counts['noFailureFullEqual'] += 1
            continue
        a, b = candidate['probes'][0], control['probes'][0]
        for field in ['actor', 'at', 'stage', 'ordinal', 'view', 'events', 'preMemory']:
            assert a[field] == b[field], (fixture, field)
        counts['firstFailureOwnInputsEqual'] += 1
        ca, co = candidate['actions'], control['actions']
        index = next((i for i, (x, y) in enumerate(zip(ca, co)) if signature(x) != signature(y)), min(len(ca), len(co)))
        changed = index < max(len(ca), len(co))
        times = [r['actions'][index]['at'] for r in [candidate, control] if changed and index < len(r['actions'])]
        if changed:
            assert min(times) >= a['at']
            counts['firstCommandChangeAfterEvidence'] += 1
        else:
            counts['failureButCommandsUnchanged'] += 1
        rows.append({'fixture': candidate['fixture'], 'style': candidate['style'],
                     'firstFailureActor': a['actor'], 'firstFailureAt': a['at'],
                     'firstFailureStage': a['stage'], 'commonPreEvidenceOwnInputs': True,
                     'commandsChanged': changed, 'sharedCommandPrefix': index,
                     'firstChangedCommandTimes': times})
    assert counts['pairs'] == counts['noFailureFullEqual'] + counts['firstFailureOwnInputsEqual']
    assert counts['firstFailureOwnInputsEqual'] == counts['firstCommandChangeAfterEvidence'] + counts['failureButCommandsUnchanged']
    return {'kind': 'own-failure-common-prefix-audit', 'sourceRef': data['sourceRef'],
            'executions': data['executions'], 'newExecutions': 0, 'counts': counts, 'failurePairs': rows,
            'limitations': ['Requires the source/design/storage verifier first.',
                            'The first relevant own-input boundary and command ordering are checked, not every policy-call memory snapshot.',
                            'This scope check does not identify a single action as the cause of a win or prove optimal information use.']}


if __name__ == '__main__':
    path = pathlib.Path(sys.argv[1]); raw = path.read_bytes()
    if str(path).endswith('.gz'):
        raw = gzip.decompress(raw)
    result = audit(json.loads(raw))
    result['rawSHA256'] = hashlib.sha256(raw).hexdigest()
    result['auditSHA256'] = hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()
    pathlib.Path(sys.argv[2]).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result['counts']))
