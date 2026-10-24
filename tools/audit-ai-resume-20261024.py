"""Recount saved primary games and report links; never simulate or select a policy."""
import datetime,gzip,hashlib,json,pathlib,re,sys
root=pathlib.Path(__file__).resolve().parents[1];dest=root/'docs/evaluations'
sha=lambda b:hashlib.sha256(b).hexdigest()
load=lambda p:json.loads(p.read_bytes())
active=load(root/'docs/ai-rounds/ACTIVE.json');ledger_path=root/active['corpusAudit']['path'];ledger=load(ledger_path)
historical_path=dest/'cooperation-interim-001-057-audit.json';historical=load(historical_path)
prior={d['round']:d for d in historical['datasets']}
def games(value):
 if isinstance(value,dict):
  if {'fixture','winner','winnerPolicy'}<=value.keys():yield value
  else:
   for child in value.values():yield from games(child)
 elif isinstance(value,list):
  for child in value:yield from games(child)
def original(row):
 number=row['round']
 if number==55:
  parts_path=dest/'cooperation-round-055-development.parts.json';parts=load(parts_path);encoded=b''
  for item in parts['parts']:
   path=parts_path.parent/item['name'];chunk=path.read_bytes();assert len(chunk)==item['bytes'] and sha(chunk)==item['sha256'];encoded+=chunk
  assert len(encoded)==parts['compressedBytes'] and sha(encoded)==parts['compressedSHA256']
  decoded=gzip.decompress(encoded);assert sha(decoded)==parts['decodedSHA256'];return decoded,str(parts_path.relative_to(root))
 path=root/(prior[number]['raw'] if number in prior else row['rawPath'])
 raw=path.read_bytes();return (gzip.decompress(raw) if path.suffix=='.gz' else raw),str(path.relative_to(root))
rows=[];used=set();numbers=set()
for row in ledger['primaryDatasets']:
 number=row['round'];assert number not in numbers;numbers.add(number)
 raw,path=original(row);data=json.loads(raw);actual=list(games(data));count=len(actual)
 assert count==row['executions'] and data['start']==row['start'] and data['count']==row['count']
 digest=sha(raw);expected=prior[number]['decodedSHA256'] if number in prior else row['snapshotSHA256'];assert digest==expected
 seeds=set(range(row['start'],row['start']+row['count']));assert not used&seeds;used|=seeds
 unfinished=sum(g['winner'] is None for g in actual)
 if number in prior:assert unfinished==prior[number]['unfinished']
 else:assert unfinished==row['unfinished'] and data['complete']
 rows.append({'round':number,'executions':count,'terminated':count-unfinished,'unfinished':unfinished,'start':row['start'],'count':row['count'],'decodedSHA256':digest,'raw':path})
 print(json.dumps({'round':number,'executions':count,'unfinished':unfinished}),flush=True)
totals={key:sum(r[key] for r in rows) for key in ['executions','terminated','unfinished']}
assert totals=={'executions':active['cumulativeExecutions'],'terminated':active['cumulativeTerminatedExecutions'],'unfinished':active['cumulativeUnfinishedExecutions']}
assert totals['executions']==ledger['verifiedExecutions'] and totals['unfinished']==ledger['unfinished']
assert not used&set(range(121000,121016)) and not used&set(range(152016,152080))
round_docs=sorted((root/'docs/ai-rounds').glob('ROUND_*.md'));assert [int(p.name.split('_')[1]) for p in round_docs]==list(range(1,active['round']+1))
report=root/'docs/ai-rounds/INTERIM_20261024.md';report_text=report.read_text();links=re.findall(r'\|\[(\d{3})\]\((ROUND_[^)]+)\)',report_text)
assert [int(n) for n,p in links]==list(range(58,active['round']+1))+list(range(1,58))
for n,p in links:assert (report.parent/p).exists() and int(p.split('_')[1])==int(n)
result={'kind':'gst-20261024-complete-primary-recount','asOf':datetime.datetime.now(datetime.timezone.utc).isoformat(),'newResearchExecutions':0,'newEngineReplays':0,'activeRound':active['round'],'activeStatus':active['status'],'primaryDatasets':len(rows),'roundDocuments':len(round_docs),'totals':totals,'resumeNewResearchExecutions':totals['executions']-48832,'seedRangesDisjoint':True,'holdout121000Unused':True,'remaining152016Unused':True,'ledgerPath':str(ledger_path.relative_to(root)),'ledgerSHA256':sha(ledger_path.read_bytes()),'historicalRecountSHA256':sha(historical_path.read_bytes()),'reportSHA256':sha(report.read_bytes()),'scriptSHA256':sha(pathlib.Path(__file__).read_bytes()),'datasets':rows,'scope':'Stored original game counts/hashes and report index; no repeated historical semantic tests, no rerun, tuning or new game.'}
pathlib.Path(sys.argv[1]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['primaryDatasets','roundDocuments','totals','resumeNewResearchExecutions','newResearchExecutions']}))
