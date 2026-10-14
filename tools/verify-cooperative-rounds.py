"""Independently recount paired fixtures, diagnostics, scores and source hashes."""
import argparse, collections, gzip, hashlib, json, pathlib, random, subprocess

parser=argparse.ArgumentParser()
parser.add_argument('path',type=pathlib.Path)
parser.add_argument('--source-ref',help='Verify the recorded source at an immutable Git commit')
parser.add_argument('--allow-partial',action='store_true')
parser.add_argument('--observer-source',type=pathlib.Path,help='Explicit archived observer source for interrupted diagnostics')
args=parser.parse_args()
raw=args.path.read_bytes()
d=json.loads(gzip.decompress(raw) if args.path.suffix=='.gz' else raw)
assert d['kind']=='cooperative-resource-comparison'
modes=['civil_war','primordial','lidellut','troll']
styles=['truthful','bluff','skill-aware-bluff']
assert d['phase'] in ['development','holdout']
assert d['count']>0 and len(set(d['variants']))==len(d['variants'])
if not args.allow_partial:assert len(d['rows'])==12
for path,sha in d['sourceHashes'].items():
 assert '..' not in pathlib.PurePosixPath(path).parts
 if path=='scripts/cooperative-rounds.ts' and args.observer_source:source=args.observer_source.read_bytes()
 elif args.source_ref:source=subprocess.check_output(['git','show',args.source_ref+':packages/rules/'+path])
 else:source=pathlib.Path('packages/rules',path).read_bytes()
 assert hashlib.sha256(source).hexdigest()==sha,path

out={'format':1,'phase':d['phase'],'start':d['start'],'seeds':d['count'],'complete':len(d['rows'])==12,'executions':0,'sourceHashes':d['sourceHashes'],'options':d['options'],'variants':{},'contrasts':{},'design':d['design']}
scores=collections.defaultdict(lambda:collections.defaultdict(list))
seen=set()
for row in d['rows']:
 mode,style=row['mode'],row['style'];assert mode in modes and style in styles
 assert (mode,style) not in seen;seen.add((mode,style))
 assert set(row['results'])==set(d['variants'])
 for variant,r in row['results'].items():
  games,diags=r['games'],r['diagnostics'];assert len(games)==len(diags)==d['count']*4
  fixtures=set();wins=collections.Counter();paired=collections.defaultdict(list)
  bucket=out['variants'].setdefault(variant,{}).setdefault(mode,{'games':0,'scoreSum':0,'unfinished':0,'earlyAttackFailures':0,'rejected':0,'economy':collections.Counter(),'gemStageMissed':collections.Counter(),'observations':collections.Counter(),'byRole':{},'survival':{},'resources':{},'gemUseConditions':collections.Counter(),'rejectionReasons':collections.Counter(),'deferralSummary':collections.Counter(),'deferralSkills':collections.Counter()})
  for g,diag in zip(games,diags):
   f=g['fixture'];assert f==diag['fixture'] and f['mode']==mode
   assert d['start']<=f['seed']<d['start']+d['count'] and f['count']==8+(f['seed']-d['start'])%5
   k=(f['seed'],f['reversed'],f['currentSide']);assert k not in fixtures;fixtures.add(k)
   assert type(f['reversed']) is bool and f['currentSide'] in [1,2]
   assert g['winnerPolicy']==(None if g['winner'] is None else 'current' if g['winner']==f['currentSide'] else 'reference')
   score=0.5 if g['winnerPolicy'] is None else float(g['winnerPolicy']=='current')
   paired[f['seed']].append(score);wins[g['winnerPolicy'] or 'unfinished']+=1
   for s in g['stats'].values():assert s['attempted']==s['accepted']+s['rejected']
   e=diag['economy'];assert e['allyMana']==10*e['allies']
   assert 0<=e['gemGrowthMissed']<=e['falseNameTurns']<=e['turns']
   assert sum(e['gemStageMissed'].values())==e['gemGrowthMissed']
   for key in ['turns','falseNameTurns','gemGrowthMissed']:assert sum(v[key] for v in diag['byRole'].values())==e[key]
   for stage in ['0','1','2']:assert sum(v['gemStageMissed'][stage] for v in diag['byRole'].values())==e['gemStageMissed'][stage]
   bucket['games']+=1;bucket['scoreSum']+=score;bucket['unfinished']+=int(g['winner'] is None)
   bucket['earlyAttackFailures']+=g['stats']['current']['earlyAttackFailures'];bucket['rejected']+=g['stats']['current']['rejected']
   bucket['economy'].update({k:v for k,v in e.items() if k!='gemStageMissed'});bucket['gemStageMissed'].update(e['gemStageMissed']);bucket['observations'].update(diag['observations'])
   assert len(g['survivors'])==f['count'] and len({p['character'] for p in g['survivors']})==f['count']
   for p in g['survivors']:
    assert type(p['alive']) is bool and p['controller'] in ['current','reference']
    if p['controller']=='current':
     survival=bucket['survival'].setdefault(p['character'],{'games':0,'alive':0});survival['games']+=1;survival['alive']+=int(p['alive'])
   for role,v in diag['byRole'].items():
    assert 0<=v['gemGrowthMissed']<=v['falseNameTurns']<=v['turns'] and sum(v['gemStageMissed'].values())==v['gemGrowthMissed']
    target=bucket['byRole'].setdefault(role,{'turns':0,'falseNameTurns':0,'gemGrowthMissed':0,'gemStageMissed':collections.Counter()})
    for key in ['turns','falseNameTurns','gemGrowthMissed']:target[key]+=v[key]
    target['gemStageMissed'].update(v['gemStageMissed'])
   for role,v in diag.get('resources',{}).items():
    assert 0<=v['trueNameMs']<=v['aliveMs']<=g['elapsedMs']+d['settings']['tickMs']
    assert type(v['gemCompleted']) is bool and (v['firstCompletedAt'] is not None)==v['gemCompleted']
    if v['firstCompletedAt'] is not None:assert 0<=v['firstCompletedAt']<=g['elapsedMs']
    actions=[a for a in diag['reportActions'] if a['role']==role]
    for kind in ['check','attack']:
     matched=[a for a in actions if a['kind']==kind]
     assert v['reportChecks' if kind=='check' else 'reportAttacks']==len(matched)
     assert v['reportCheckMana' if kind=='check' else 'reportAttackMana']==sum(a['mana'] for a in matched)
    assert v['reportAttackFailures']==sum(a['failure'] for a in actions)
    for a in actions:
     assert a['mana']>=0 and 0<=a['at']<=g['elapsedMs'] and a['reportAt'] is not None and 0<=a['reportAt']<=a['at']
     if a['kind']=='attack':assert a['skill']=='supreme_attack'
    target=bucket['resources'].setdefault(role,collections.Counter())
    target['games']+=1
    target.update({k:int(x) for k,x in v.items() if k!='firstCompletedAt'})
   if 'gemUses' in diag:
    assert len(diag['gemUses'])==sum(v['partialGemUses']+v['fullGemUses'] for v in diag['resources'].values())
    for a in diag['gemUses']:
     assert a['stage'] in [2,3] and 0<=a['at']<=g['elapsedMs'] and 0<=a['nextTurnInMs']<=90000
     assert 0<=a['mana']<=150 and 0<=a['nextTurnManaPreview']<=150-a['mana']
     assert a['nearCompletion']==(a['stage']==2 and a['trueName'] and 0<a['nextTurnInMs']<=43000 and a['mana']+a['nextTurnManaPreview']>=75)
     c=bucket['gemUseConditions'];c['allUses']+=1;c['partialUses']+=int(a['stage']==2)
     c['partialTrueName']+=int(a['stage']==2 and a['trueName'])
     c['partialWithin43s']+=int(a['stage']==2 and 0<a['nextTurnInMs']<=43000)
     c['nearCompletionUses']+=int(a['nearCompletion'])
     c['nearCompletionAlternativeReady']+=int(a['nearCompletion'] and bool(a['alternativeChecks']))
     c['partialWithOtherCheckReady']+=int(a['stage']==2 and bool(a['alternativeChecks']))
     c['commanderAlreadyObserved']+=int(a['targetCommanderObserved'])
     if d['options'].get(variant,{}).get('preservePartialGem'):assert not a['nearCompletion'],a
   if 'rejections' in diag:
    assert len(diag['rejections'])==g['stats']['current']['rejected']
    counted=collections.Counter()
    for a in diag['rejections']:
     assert 0<=a['at']<=g['elapsedMs'] and a['error']
     action=a['action'];key=action['skill'] if action['type']=='skill' else action['type']
     counted[key]+=1;bucket['rejectionReasons'][a['error']]+=1
    assert dict(counted)==g['stats']['current']['rejectedSkills']
   for a in diag.get('deferrals',[]):
    assert d['options'][variant].get('preservePartialGem')
    assert a['wouldUse']['type']=='skill' and a['wouldUse']['skill']=='truth_gem'
    assert 0<=a['at']<=g['elapsedMs'] and 0<a['nextTurnInMs']<=43000
    assert a['gemExpectedInformation']>=0 and a['nominalMana']>=0
    assert a['alternativeExpectedInformation'] is None or a['alternativeExpectedInformation']>=0
    s=bucket['deferralSummary'];s['decisions']+=1;s['gemExpectedInformation']+=a['gemExpectedInformation']
    chosen=a['chosen'];key=chosen['skill'] if chosen and chosen['type']=='skill' else chosen['type'] if chosen else 'wait'
    assert key!='truth_gem';bucket['deferralSkills'][key]+=1
    if chosen is None:assert a['accepted'] is None and a['nominalMana']==0
    else:
     assert type(a['accepted']) is bool
     assert (a['error'] is None)==a['accepted']
    s['waits']+=int(chosen is None);s['accepted']+=int(a['accepted'] is True);s['rejected']+=int(a['accepted'] is False)
    if a['accepted']:s['acceptedNominalMana']+=a['nominalMana']
    if a['alternativeExpectedInformation'] is not None:
     s['informationActions']+=1;s['alternativeExpectedInformation']+=a['alternativeExpectedInformation']
     s['zeroExpectedInformation']+=int(a['alternativeExpectedInformation']<=1e-12)
    if a['ended']:assert a['knownAfter'] is None and a['totalCandidatesAfter'] is None
    if a['knownAfter'] is not None:
     assert a['knownAfter']>=0 and a['totalCandidatesAfter']>=0
     s['immediateMeasured']+=1;s['newKnown']+=a['knownAfter']-a['knownBefore']
     s['candidateReduction']+=a['totalCandidatesBefore']-a['totalCandidatesAfter']
  assert len(fixtures)==d['count']*4 and all(len(x)==4 for x in paired.values())
  for seed,x in paired.items():scores[variant][seed].append(sum(x)/4)
  s=r['summary'];assert s['games']==len(games) and s['seeds']==d['count']
  for key in ['current','reference','unfinished']:assert s['wins'][key]==wins[key]
  assert abs(s['currentScore']-sum(sum(x)/4 for x in paired.values())/d['count'])<1e-12
  for x in s['pairedScores']:assert x['score']==sum(paired[x['seed']])/4
  out['executions']+=len(games)

def interval(values):
 rng=random.Random(0x475354)
 means=sorted(sum(rng.choices(values,k=len(values)))/len(values) for _ in range(10000))
 return [means[250],means[9749]]

for variant,by_mode in out['variants'].items():
 for bucket in by_mode.values():bucket['score']=bucket.pop('scoreSum')/bucket['games']
 out['variants'][variant]['aggregateScore']=sum(sum(x)/len(x) for x in scores[variant].values())/d['count']
for variant in d['variants']:
 if variant=='baseline':continue
 out['contrasts'][variant]={}
 for reference in ['baseline','control']:
  if variant==reference or reference not in scores:continue
  values=[sum(scores[variant][seed])/len(scores[variant][seed])-sum(scores[reference][seed])/len(scores[reference][seed]) for seed in sorted(scores[variant])]
  out['contrasts'][variant][reference]={'difference':sum(values)/len(values),'seedBootstrap95':interval(values),'modes':{m:out['variants'][variant][m]['score']-out['variants'][reference][m]['score'] for m in modes if m in out['variants'][variant]}}
out['safetyClear']=all(b['unfinished']==b['earlyAttackFailures']==b['observations']['wrongAllies']==b['observations']['falseReports']==0 for v in d['variants'] if v!='baseline' for m,b in out['variants'][v].items() if m!='aggregateScore')
out['promotionEvidence']={v:d['phase']=='holdout' and out['complete'] and out['safetyClear'] and c['baseline']['seedBootstrap95'][0]>0 and all(x>=-0.02 for x in c['baseline']['modes'].values()) for v,c in out['contrasts'].items()}
print(json.dumps(out,ensure_ascii=False,indent=2))
