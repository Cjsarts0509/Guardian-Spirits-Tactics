import json,collections,random,hashlib,pathlib,gzip,argparse,subprocess
parser=argparse.ArgumentParser();parser.add_argument('path',nargs='?',default='docs/evaluations/cooperation-holdout.json.gz');parser.add_argument('--source-ref');args=parser.parse_args()
def source(path):
 return subprocess.check_output(['git','show',args.source_ref+':'+str(path)]) if args.source_ref else path.read_bytes()
p=pathlib.Path(args.path);d=json.loads(gzip.decompress(p.read_bytes()) if p.suffix=='.gz' else p.read_text());diffs=collections.defaultdict(list)
for row in d['rows']:
 for v in ['baseline','candidate']:
  r=row['results'][v]; assert r['summary']['games']==d['count']*4;assert len(r['games'])==d['count']*4
 a={s['seed']:s['score'] for s in row['results']['baseline']['summary']['pairedScores']};b={s['seed']:s['score'] for s in row['results']['candidate']['summary']['pairedScores']}
 for seed in a:diffs[seed].append(b[seed]-a[seed])
means=[sum(v)/len(v) for v in diffs.values()];rng=random.Random(0x475354);resamples=sorted(sum(rng.choices(means,k=len(means)))/len(means) for _ in range(10000));ci=[resamples[250],resamples[9749]]
out={'format':1,'start':d['start'],'seeds':d['count'],'pairedFixtures':sum(len(r['results']['candidate']['games']) for r in d['rows']),'executions':sum(len(r['results'][v]['games']) for r in d['rows'] for v in ['baseline','candidate']),'sourceHashes':d['hashes'],'scoreDifference':sum(means)/len(means),'seedBootstrap95':ci,'modes':{}}
for m in ['civil_war','primordial','lidellut','troll']:
 rows=[r for r in d['rows'] if r['mode']==m];out['modes'][m]={}
 for v in ['baseline','candidate']:
  observations={k:sum(r['results'][v]['observations'][k] for r in rows) for k in rows[0]['results'][v]['observations']}
  out['modes'][m][v]={'score':sum(r['results'][v]['summary']['currentScore'] for r in rows)/len(rows),'unfinished':sum(r['results'][v]['summary']['wins']['unfinished'] for r in rows),'earlyAttackFailures':sum(r['results'][v]['summary']['stats']['current']['earlyAttackFailures'] for r in rows),'rejected':sum(r['results'][v]['summary']['stats']['current']['rejected'] for r in rows),'observations':observations}
for f,sha in d['hashes'].items():
 if f.endswith('.ts'):
  assert hashlib.sha256(source(pathlib.Path('packages/rules/src',f))).hexdigest()==sha,f
for key,path in [('baseline','packages/rules/scripts/baselines/pre-cooperative.ts'),('runner','packages/rules/scripts/league-runner.ts')]:
 assert hashlib.sha256(source(pathlib.Path(path))).hexdigest()==d['hashes'][key],key
out['promotionEvidence']=ci[0]>0
pathlib.Path('docs/evaluations/cooperation-summary.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps(out,ensure_ascii=False,indent=2))
