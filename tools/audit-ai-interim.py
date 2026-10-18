"""Read-only recount for the 001-057 interim report; never runs games."""
import gzip
import hashlib
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
E = ROOT / 'docs/evaluations'
ledger = json.loads((E / 'cooperation-round-055-cumulative-audit.json').read_text())
historical = json.loads((E / 'cooperation-corpus-manifest.json').read_text())
old = {x['round']: x for x in historical['datasets']}

def games(obj):
    if isinstance(obj, dict):
        if {'fixture', 'winner', 'winnerPolicy'} <= obj.keys():
            yield obj
        else:
            for value in obj.values():
                yield from games(value)
    elif isinstance(obj, list):
        for value in obj:
            yield from games(value)

rows = []
used = set()
for item in ledger['primaryDatasets']:
    r = item['round']
    if r in old:
        path = ROOT / old[r]['raw']
    elif r == 55:
        path = pathlib.Path(sys.argv[1])
    else:
        suffix = 'selfplay' if r in (35, 36, 39, 45) else 'development'
        path = E / f'cooperation-round-{r:03d}-{suffix}.json.gz'
    data = path.read_bytes()
    if r in old:
        assert hashlib.sha256(data).hexdigest() == old[r]['rawGzSHA256'], r
    decoded = gzip.decompress(data) if path.suffix == '.gz' else data
    obj = json.loads(decoded)
    gs = list(games(obj))
    assert len(gs) == item['executions'], (r, len(gs), item['executions'])
    assert obj['start'] == item['start'] and obj['count'] == item['count'], r
    seeds = set(range(item['start'], item['start'] + item['count']))
    assert not used & seeds, r
    used |= seeds
    sha = hashlib.sha256(decoded).hexdigest()
    if item.get('snapshotSHA256'):
        assert sha == item['snapshotSHA256'], r
    if r == 55:
        assert sha == ledger['newSnapshotSHA256']
    rows.append({'round': r, 'executions': len(gs),
                 'unfinished': sum(g['winner'] is None for g in gs),
                 'seedStart': item['start'], 'seedCount': item['count'],
                 'decodedSHA256': sha,
                 'raw': str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else 'materialized round055 parts'})
assert len(rows) == 35
assert sum(x['executions'] for x in rows) == 48832
assert sum(x['unfinished'] for x in rows) == 2
assert not used & set(range(121000, 121016))
assert not used & set(range(152008, 152080))
rounds = sorted((ROOT / 'docs/ai-rounds').glob('ROUND_*.md'))
assert [int(p.name.split('_')[1]) for p in rounds] == list(range(1, 58))
out = {'kind': 'gst-ai-interim-001-057-recount', 'asOf': '2026-10-18',
       'evidenceHead': '6023a536a13ee1e326cadb53b5d5824aebeb9c29',
       'newResearchExecutions': 0, 'roundDocuments': 57, 'primaryDatasets': 35,
       'researchExecutions': 48832, 'terminated': 48830, 'unfinished': 2,
       'seedRangesDisjoint': True, 'holdout121000Unused': True,
       'remaining152008Unused': True, 'datasets': rows,
       'scope': 'Recount of original stored game records, ledger ranges and available recorded hashes. Not a new engine replay or rerun of every historical semantic verifier.',
       'roundDocumentSHA256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in rounds}}
pathlib.Path(sys.argv[2]).write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({k: out[k] for k in ('roundDocuments', 'primaryDatasets', 'researchExecutions', 'terminated', 'unfinished', 'newResearchExecutions')}))
