"""Verify saved round manifests and the report index without playing any games."""
import datetime
import gzip
import hashlib
import json
import pathlib
import re
import sys

root = pathlib.Path(__file__).resolve().parents[1]
dest = root / 'docs/evaluations'
sha = lambda raw: hashlib.sha256(raw).hexdigest()
load = lambda path: json.loads(path.read_bytes())
active = load(root / 'docs/ai-rounds/ACTIVE.json')
assert active['status'] == 'completed'
recount_path = dest / 'cooperation-resume-20261024-primary-recount.json'
recount = load(recount_path)
ledger = root / recount['ledgerPath']
assert sha(ledger.read_bytes()) == recount['ledgerSHA256']
assert recount['totals'] == {
    'executions': active['cumulativeExecutions'],
    'terminated': active['cumulativeTerminatedExecutions'],
    'unfinished': active['cumulativeUnfinishedExecutions'],
}
verified = {}
for number in range(62, active['round'] + 1):
    path = dest / f'cooperation-round-{number:03d}-completion.json'
    completion = load(path)
    assert completion['completedAt']
    verified[str(path.relative_to(root))] = sha(path.read_bytes())
    for name, metadata in completion['manifest'].items():
        raw = (root / name).read_bytes()
        assert sha(raw) == metadata['sha256'], name
        if 'bytes' in metadata:
            assert len(raw) == metadata['bytes'], name
        if 'decodedSHA256' in metadata:
            decoded = gzip.decompress(raw) if name.endswith('.gz') else raw
            assert sha(decoded) == metadata['decodedSHA256'], name
            if 'decodedBytes' in metadata:
                assert len(decoded) == metadata['decodedBytes'], name
        verified[name] = sha(raw)
report = root / active['interimReport']
links = re.findall(r'\|\[(\d{3})\]\((ROUND_[^)]+)\)', report.read_text())
assert sorted(int(n) for n, _ in links) == list(range(1, active['round'] + 1))
rounds = {}
for number, name in links:
    path = report.parent / name
    assert int(path.name.split('_')[1]) == int(number)
    rounds[name] = sha(path.read_bytes())
assert active['holdoutSeeds']['status'] == 'unused'
assert active['nextSeeds']['status'] == 'reserved_unused'
assert active['humanValidation']['actualHumanMatches'] == 0
assert active['runtime']['processAlive'] is False
result = {
    'kind': 'gst-resume-closure-manifest-check',
    'checkedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'lastCompletedRound': active['round'],
    'stoppedAt': active.get('stoppedAt'),
    'automationEnabled': active['scheduling']['enabled'],
    'totals': recount['totals'],
    'resumeNewResearchExecutions': recount['resumeNewResearchExecutions'],
    'primaryDatasets': recount['primaryDatasets'],
    'newResearchExecutions': 0,
    'newEngineReplays': 0,
    'priorPrimaryRecountSHA256': sha(recount_path.read_bytes()),
    'priorPrimaryRecountAt': recount['asOf'],
    'unchangedPrimaryLedgerSHA256': sha(ledger.read_bytes()),
    'verifiedCompletionAndArtifactSHA256': verified,
    'roundDocumentSHA256': rounds,
    'reportSHA256': sha(report.read_bytes()),
    'scriptSHA256': sha(pathlib.Path(__file__).read_bytes()),
    'scope': 'Reuses the earlier complete 38-dataset primary recount after checking its ledger is unchanged. Checks every round link and 062 onward completion manifests; does not reclassify old games or rerun policies.',
}
pathlib.Path(sys.argv[1]).write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'rounds': len(rounds), 'verifiedFiles': len(verified), 'totals': result['totals'], 'stoppedAt': result['stoppedAt']}))
