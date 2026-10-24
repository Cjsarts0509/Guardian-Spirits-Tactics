"""Restore an immutable evaluation prefix into a NEW local store, without playing games."""
import gzip, hashlib, json, pathlib, re, sys

bundle=json.loads(gzip.decompress(pathlib.Path(sys.argv[1]).read_bytes()))
expected_kind={'round062-canonical-checkpoint':'own-failure-faction-development',
               'round063-canonical-checkpoint':'own-failure-faction-identical-policy'}
assert bundle['kind'] in expected_kind
target=pathlib.Path(sys.argv[2]+'.store')
assert not target.exists(), 'Refuse to overwrite any existing store, including a live writer.'
stem=sys.argv[2].removesuffix('.json')
assert not any(pathlib.Path(p).exists() for p in [sys.argv[2],stem+'.journal.ndjson',stem+'.publication.json']), 'Refuse to replace existing exports.'
files=bundle['files'];assert set(files)==set(bundle['sha256'])
for name,text in files.items():
 assert name in ['metadata.json','HEAD.json'] or re.fullmatch(r'records/[a-f0-9]{64}\.json',name)
 assert hashlib.sha256(text.encode()).hexdigest()==bundle['sha256'][name]
meta=json.loads(files['metadata.json']);head=json.loads(files['HEAD.json'])
assert meta['meta']['kind']==expected_kind[bundle['kind']]
assert meta['fingerprint']==head['fingerprint']==bundle['fingerprint']
assert meta['meta']['sourceRef']==bundle['sourceRef'] and head['count']==bundle['executions']
records=sorted([json.loads(text) for name,text in files.items() if name.startswith('records/')],key=lambda r:r['ordinal'])
assert len(records)==bundle['executions'] and [r['ordinal'] for r in records]==list(range(len(records)))
for record in records:
 assert record['version']==2 and record['fingerprint']==bundle['fingerprint']
 name='records/'+hashlib.sha256(record['key'].encode()).hexdigest()+'.json'
 assert name in files and json.loads(files[name])==record
assert head['key']==records[-1]['key'] and head['sha256']==records[-1]['sha256']
target.mkdir(parents=True)
for name,text in files.items():
 path=target/name;path.parent.mkdir(exist_ok=True);path.write_bytes(text.encode())
 assert hashlib.sha256(path.read_bytes()).hexdigest()==bundle['sha256'][name]
print(json.dumps({'restoredExecutions':len(records),'sourceRef':bundle['sourceRef'],'out':sys.argv[2],'newGames':0,'writerLockCopied':False}))
