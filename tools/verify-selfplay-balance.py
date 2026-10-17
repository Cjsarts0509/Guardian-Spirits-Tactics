"""Validate persisted identical-policy matches and report faction outcomes, not a fictional AI-vs-itself win rate."""
import argparse,collections,gzip,hashlib,json,pathlib,random,subprocess
p=argparse.ArgumentParser();p.add_argument('path',type=pathlib.Path);p.add_argument('--source-ref');p.add_argument('--journal-path',type=pathlib.Path,required=True);p.add_argument('--allow-partial',action='store_true');a=p.parse_args()
def read(path):
 b=path.read_bytes();return gzip.decompress(b) if path.suffix=='.gz' else b
def sha(b):return hashlib.sha256(b).hexdigest()
raw=read(a.path);d=json.loads(raw);assert d['kind']=='identical-policy-faction-balance'
meta={k:v for k,v in d.items() if k not in ['fingerprint','complete','executions','journalSha256','records']}
assert sha(json.dumps(meta,ensure_ascii=False,separators=(',',':')).encode())==d['fingerprint']
journal=read(a.journal_path);lines=journal.splitlines();header=json.loads(lines[0]);assert header=={'type':'header','fingerprint':d['fingerprint'],'meta':meta}
assert [json.loads(x) for x in lines[1:]]==d['records'] and sha(journal)==d['journalSha256']
base=str(a.path).removesuffix('.gz').removesuffix('.json');pub=json.loads(pathlib.Path(base+'.publication.json').read_text())
assert pub=={'version':2,'fingerprint':d['fingerprint'],'executions':d['executions'],'complete':d['complete'],'snapshotSHA256':sha(raw),'journalSHA256':sha(journal)}
if a.source_ref:
 files=subprocess.check_output(['git','ls-tree','-r','--name-only',a.source_ref,'packages/rules/src'],text=True).splitlines()
 expected={x.removeprefix('packages/rules/') for x in files if x.endswith('.ts')}
else:expected={'src/'+str(x.relative_to('packages/rules/src')) for x in pathlib.Path('packages/rules/src').rglob('*.ts')}
expected|={'scripts/'+s for s in ['selfplay-balance.ts','selfplay-balance-run.ts','league-runner.ts','cooperative-store.ts','baselines/pre-cooperative.ts']}
assert set(d['sourceHashes'])==expected
for path,digest in d['sourceHashes'].items():
 assert '..' not in pathlib.PurePosixPath(path).parts
 b=subprocess.check_output(['git','show',a.source_ref+':packages/rules/'+path]) if a.source_ref else pathlib.Path('packages/rules',path).read_bytes()
 assert sha(b)==digest,path
assert d['variants']==['main','cooperative','ownOutcome'] and d['design']['policiesIdenticalOnBothTeams'] and d['design']['currentSide']==1
seen=set();modes={};role_stats={};seeds=collections.defaultdict(lambda:collections.defaultdict(list));count_stats={}
for r in d['records']:
 v,g=r['variant'],r['game'];f=g['fixture'];mode=f['mode'];key=(v,mode,f['seed'],f['reversed'])
 assert key not in seen and v in d['variants'] and mode in ['civil_war','primordial','lidellut','troll'];seen.add(key)
 assert f['currentSide']==1 and d['start']<=f['seed']<d['start']+d['count'] and f['count']==8+(f['seed']-d['start'])%5
 assert g['winner'] in [None,1,2] and g['winnerPolicy']==(None if g['winner'] is None else 'current' if g['winner']==1 else 'reference')
 roles={p['character']:p for p in r['roles']};assert len(roles)==len(r['roles'])==f['count'] and len({p['id'] for p in r['roles']})==f['count']
 assert set(roles)=={p['character'] for p in g['survivors']} and all(p['side'] in [1,2] for p in roles.values())
 for p in g['survivors']:assert p['controller']==('current' if roles[p['character']]['side']==1 else 'reference')
 score=.5 if g['winner'] is None else int(g['winner']==1);seeds[(mode,v)][f['seed']].append(score)
 b=modes.setdefault(mode,{}).setdefault(v,{'games':0,'side1Wins':0,'side2Wins':0,'unfinished':0,'side1ScoreSum':0,'failedAttacks':0})
 b['games']+=1;b['side1Wins']+=int(g['winner']==1);b['side2Wins']+=int(g['winner']==2);b['unfinished']+=int(g['winner'] is None);b['side1ScoreSum']+=score
 c=count_stats.setdefault(mode,{}).setdefault(v,{}).setdefault(str(f['count']),{'games':0,'side1Wins':0,'side2Wins':0,'unfinished':0});c['games']+=1;c['side1Wins']+=int(g['winner']==1);c['side2Wins']+=int(g['winner']==2);c['unfinished']+=int(g['winner'] is None)
 for character,role in roles.items():
  z=role_stats.setdefault(mode,{}).setdefault(v,{}).setdefault(character,{'side':role['side'],'appearances':0,'teamWins':0,'survived':0,'skills':{}})
  assert z['side']==role['side'];z['appearances']+=1;z['teamWins']+=int(g['winner']==role['side']);z['survived']+=int(next(p for p in g['survivors'] if p['character']==character)['alive'])
  for skill,stats in r['skills'].get(character,{}).items():
   assert 0<=stats['failedAttacks']<=stats['accepted']<=stats['attempts'];z['skills'].setdefault(skill,collections.Counter()).update(stats);b['failedAttacks']+=stats['failedAttacks']
 if not a.allow_partial:
  assert 0<g['elapsedMs']<=d['settings']['limitMs']
assert d['executions']==len(seen)
if not a.allow_partial:assert d['complete'] and len(seen)==d['count']*4*2*3
for (mode,v),values in seeds.items():
 if not a.allow_partial:assert len(values)==d['count'] and all(len(x)==2 for x in values.values())
 units=[sum(x)/len(x) for x in values.values()];rng=random.Random(0x475354);samples=sorted(sum(rng.choices(units,k=len(units)))/len(units) for _ in range(10000))
 b=modes[mode][v];b['side1Score']=b['side1ScoreSum']/b['games'];b['seedBootstrap95']=[samples[250],samples[9749]];b['seedCount']=len(units)
print(json.dumps({'kind':d['kind'],'complete':d['complete'],'executions':d['executions'],'fingerprint':d['fingerprint'],'sourceRef':a.source_ref,'publicationVerified':True,'modes':modes,'byPlayerCount':count_stats,'roleAssociations':role_stats,'limitations':['Same-policy overall 50% is not a strength or fairness finding.','Small exploratory sample; role results are correlated team outcomes, not causal skill effects.','Skill availability and conditional use are not measured by raw usage counts.'],'snapshotSHA256':sha(raw),'journalSHA256':sha(journal)},ensure_ascii=False,indent=2))
