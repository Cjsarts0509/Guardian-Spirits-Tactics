"""Recount fixture coverage and economic counters without changing policy inputs."""
import collections, gzip, hashlib, json, pathlib, re, sys
path=pathlib.Path(sys.argv[1]);d=json.loads(gzip.decompress(path.read_bytes()) if path.suffix=='.gz' else path.read_text())
assert d['kind']=='development-diagnostic-only' and len(d['rows'])==6
seen=set();summary={'start':d['start'],'seeds':d['count'],'executions':0,'modes':{},'sourceHashes':d['sourceHashes'],'limitations':d['limitations']}
for row in d['rows']:
 key=(row['mode'],row['style']);assert key not in seen;seen.add(key)
 assert row['mode'] in ['lidellut','troll'] and row['style'] in ['truthful','bluff','skill-aware-bluff']
 for variant in ['baseline','candidate']:
  result=row['results'][variant];games=result['games'];stats=result['stats'];traces=result['traces'];assert len(games)==d['count']*4
  fixtures=set()
  for game in games:
   f=game['fixture'];assert f['mode']==row['mode'] and d['start']<=f['seed']<d['start']+d['count']
   k=(f['seed'],f['reversed'],f['currentSide']);assert k not in fixtures;fixtures.add(k)
   assert f['count']==8+(f['seed']-d['start'])%5
  assert len(traces)==stats['allies']
  assert sum(t['beforeMana']-t['afterMana'] for t in traces)==stats['allyMana']==10*len(traces)
  assert sum(t['reciprocal'] for t in traces)==stats['reciprocalAtCreation']
  assert sum(bool(t['blockedSkills']) for t in traces)==stats['potentialSkillBlocks']
  assert sum(any(re.search('attack|murder|slaughter|reaver',s) for s in t['blockedSkills']) for t in traces)==stats['potentialAttackBlocks']
  assert sum(any(re.search('scan|check|truth_gem|oracle|curse|sense|shadow_eye',s) for s in t['blockedSkills']) for t in traces)==stats['potentialCheckBlocks']
  assert 0<=stats['gemGrowthMissed']<=stats['falseNameTurns']<=stats['turns']
  assert stats['potentialTrueNameManaMissed']==stats['falseNameTurns']*10
  assert stats['turnManaGross']==20*stats['turns']+10*(stats['turns']-stats['falseNameTurns'])+stats['incomingAllyManaGross']
  bucket=summary['modes'].setdefault(row['mode'],{}).setdefault(variant,{'games':0,'unfinished':0,'earlyAttackFailures':0,'rejected':0,'stats':collections.Counter()})
  bucket['games']+=len(games);bucket['unfinished']+=sum(g['winner'] is None for g in games)
  bucket['earlyAttackFailures']+=sum(g['stats']['current']['earlyAttackFailures'] for g in games);bucket['rejected']+=sum(g['stats']['current']['rejected'] for g in games)
  bucket['stats'].update(stats);summary['executions']+=len(games)
for name,sha in d['sourceHashes'].items():
 p={'runner':'packages/rules/scripts/league-runner.ts','baseline':'packages/rules/scripts/baselines/pre-cooperative.ts','observer':'packages/rules/scripts/cooperative-economy.ts'}.get(name,'packages/rules/src/'+name)
 assert hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()==sha,name
print(json.dumps(summary,ensure_ascii=False,indent=2))
