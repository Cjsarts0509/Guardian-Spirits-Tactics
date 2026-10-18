"""Read-only reserved-range scan, layered on the existing full cumulative audit."""
import gzip,hashlib,json,pathlib,re,sys
root=pathlib.Path('docs/evaluations');rows=[];overlaps=[]
for path in sorted(root.glob('cooperation*.json.gz')):
 with gzip.open(path,'rt') as f:header=f.read(65536).split('"records"',1)[0]
 start=re.search(r'"start"\s*:\s*(\d+)',header);count=re.search(r'"count"\s*:\s*(\d+)',header)
 if start and count:
  a,n=int(start[1]),int(count[1]);row=dict(path=str(path),start=a,count=n);rows.append(row)
  if any(a<=hi and a+n-1>=lo for lo,hi in [(152000,152079),(121000,121015)]):overlaps.append(row)
assert not overlaps,overlaps
audit=root/'cooperation-round-045-cumulative-audit.json';d=json.loads(audit.read_bytes());assert d['verifiedExecutions']==47680 and len(d['primaryDatasets'])==34
completion=root/'cooperation-round-054-completion.json';last=json.loads(completion.read_bytes());assert last['newResearchExecutions']==0 and last['cumulativeExecutions']==47680 and last['reservedUnused']==[[152000,152079],[121000,121015]]
result=dict(kind='round055-prior-seed-header-and-ledger-check',primaryLedgerExecutions=47680,primaryDatasets=34,ledgerSHA256=hashlib.sha256(audit.read_bytes()).hexdigest(),latestCompletionSHA256=hashlib.sha256(completion.read_bytes()).hexdigest(),reservedRanges=[[152000,152079],[121000,121015]],inspectedRangeHeaders=rows,overlaps=overlaps,scope='Metadata range scan including interrupted stored snapshots, not a replacement for previous full corpus verification.',newResearchExecutions=0)
pathlib.Path(sys.argv[1]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(dict(headers=len(rows),overlaps=overlaps,previousVerified=47680)))
