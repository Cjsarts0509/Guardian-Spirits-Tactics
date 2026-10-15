"""Read only metadata headers; primary corpus full validation is a separate audit."""
import gzip,json,pathlib,re,sys
rows=[];unknown=[];reserved=[(121000,121015),(129000,129007),(134000,134007),(136000,136007)];hits=[]
for p in sorted(pathlib.Path('docs/evaluations').glob('cooperation*.json.gz')):
    with gzip.open(p,'rt') as f:head=f.read(65536)
    start=re.search(r'"start"\s*:\s*(\d+)',head);count=re.search(r'"count"\s*:\s*(\d+)',head)
    if not start or not count:unknown.append(str(p));continue
    s,n=int(start[1]),int(count[1]);x={'path':str(p),'start':s,'count':n};rows.append(x)
    if any(s<=b and s+n-1>=a for a,b in reserved):hits.append(x)
assert not hits and not unknown
out={'kind':'cooperation_reserved_seed_header_scan','newResearchExecutions':0,'policySelection':False,
 'scope':'All cooperation*.json.gz stored artifacts, including checkpoints/interrupted data; metadata start/count only. Primary corpus full validation is separate.',
 'reservedRanges':reserved,'inspectedFiles':rows,'unrecognizedHeaders':unknown,'overlaps':hits}
pathlib.Path(sys.argv[1]).write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
