"""Read-only immutable-source recount; no simulations, learning or policy selection."""
import argparse,collections,gzip,hashlib,json,pathlib,re,subprocess
p=argparse.ArgumentParser();p.add_argument('manifest',type=pathlib.Path);p.add_argument('--out',type=pathlib.Path,required=True);a=p.parse_args()
m=json.loads(a.manifest.read_text());assert m['kind']=='gst-cooperative-primary-corpus-manifest' and m['newResearchExecutions']==0
allowed={'verify-cooperative-economy.py','verify-cooperative-rounds.py','verify-claim-pairs.py','verify-claim-commitment.py','verify-ally-pairs.py','verify-report-pairs.py'}
used=set();rounds=set();paths=set();results=[];unused=set()
for x in m['reservedUnused']:
    seeds=set(range(x['start'],x['start']+x['count']));assert not unused&seeds;unused|=seeds
def games(x):
    if isinstance(x,dict):
        if {'fixture','winnerPolicy','winner'}<=x.keys():yield x
        else:
            for y in x.values():yield from games(y)
    elif isinstance(x,list):
        for y in x:yield from games(y)
for x in m['datasets']:
    assert x['round'] not in rounds and x['raw'] not in paths;rounds.add(x['round']);paths.add(x['raw'])
    assert x['verifier'] in allowed and re.fullmatch('[0-9a-f]{40}',x['sourceRef'])
    path=pathlib.Path(x['raw']);b=path.read_bytes();assert hashlib.sha256(b).hexdigest()==x['rawGzSHA256']
    raw=gzip.decompress(b);d=json.loads(raw);seeds=set(range(d['start'],d['start']+d['count']));assert not used&seeds and not unused&seeds;used|=seeds
    cmd=['python','tools/'+x['verifier'],x['raw'],'--source-ref',x['sourceRef']]
    if x.get('journal'):cmd+=['--journal-path',x['journal']]
    r=subprocess.run(cmd,capture_output=True,text=True);assert r.returncode==0,(x['round'],r.stderr)
    s=json.loads(r.stdout);assert s['executions']==x['expectedExecutions'] and s.get('complete',True)
    actual=list(games(d));assert len(actual)==s['executions'];unfinished=sum(g['winner'] is None for g in actual)
    result={**x,'command':cmd,'exitCode':0,'executions':s['executions'],'complete':True,'start':d['start'],'seeds':d['count'],'phase':d.get('phase','development-diagnostic'),
      'unfinishedExecutions':unfinished,'rawSHA256':hashlib.sha256(raw).hexdigest(),'verifiedSummarySHA256':hashlib.sha256(r.stdout.encode()).hexdigest(),
      'verifierSHA256':hashlib.sha256(pathlib.Path('tools',x['verifier']).read_bytes()).hexdigest()}
    if x.get('journal'):result['journalGzSHA256']=hashlib.sha256(pathlib.Path(x['journal']).read_bytes()).hexdigest()
    results.append(result);print('verified round',x['round'],'executions',s['executions'],'unfinished',unfinished,flush=True)
assert rounds==set(range(1,22))-{11}
total=sum(x['executions'] for x in results);assert total==m['expectedTotalExecutions']==31296
out={'format':1,'kind':'gst-cooperative-final-corpus-audit','newResearchExecutions':0,'policySelection':False,'promotionEvidence':False,'allPassed':True,
 'verifiedExecutions':total,'unfinishedExecutions':sum(x['unfinishedExecutions'] for x in results),'allOtherGamesTerminated':True,'datasets':results,
 'seedRangesDisjoint':True,'reservedUnused':m['reservedUnused'],'protectedHistoricalFinals':m['protectedHistoricalFinals'],'exclusions':m['exclusions'],
 'manifestSHA256':hashlib.sha256(a.manifest.read_bytes()).hexdigest(),'auditSourceSHA256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()}
a.out.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
