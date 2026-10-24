"""Round048: observational coverage, not a skill/policy counterfactual."""
import collections,gzip,hashlib,importlib.util,json,pathlib,sys
spec=importlib.util.spec_from_file_location('death_verify',pathlib.Path(__file__).with_name('verify-commander-death-replay.py'));v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
GUARD={'rael':'kumarin','eltas':'consume'}
def guard_status(death,assigned):
 c=death['character'];g=death['before']['externalProtection'];guardian=GUARD.get(c)
 if not guardian:assert g is None;return 'no_guardian_role',None
 if guardian not in assigned:assert g is None;return 'guardian_not_assigned',None
 assert g and g['character']==guardian
 if not g['alive']:return 'guardian_dead',None
 if g['bodyguard']:return ('active_charged' if g['charges']>0 else 'active_empty'),None
 view=g['guardianOwnView'];assert view and view['alive'];skill=next((s for s in view['skills'] if s['key']==guardian+'_master_guard' or s['key']==guardian+'_commander_guard'),None)
 if skill is None:return 'unactivated_guard_skill_absent',None
 ready=not skill['passive'] and skill['blocked'] is None and skill['usesLeft']!=0 and skill['cooldownRemainingMs']==0 and view['mana']>=skill['mana']
 return ('unactivated_nominally_ready' if ready else 'unactivated_unavailable'),dict(mana=view['mana'],skill=skill)
def analyze(original,replay,verified,expected_games=320):
 assert isinstance(expected_games,int) and expected_games>0
 assert original['complete'] and replay['complete'] and original['executions']==replay['executions']==verified['uniqueReplayedGames']==expected_games
 games=[];buckets={};seen=set()
 for o,r in zip(original['records'],replay['records']):
  v.validate_row(r,o);f=r['fixture'];key=(r['variant'],f['seed'],f['reversed']);assert key not in seen;seen.add(key)
  roles={p['character']:p for p in o['roles']};byid={p['id']:p for p in o['roles']};assigned=set(roles);assert len(roles)==f['count']
  leaders={c:dict(character=c,guardian=GUARD.get(c),guardianAssigned=GUARD.get(c) in assigned,aliveAtEnd=next(p['alive'] for p in r['finalCommanders'] if p['character']==c),counts=collections.Counter(),death=None,attackReceipts=[]) for c in v.COMMANDERS}
  for c,row in leaders.items():
   b=row['counts'];b['games']+=1;b['leaderSurvived']+=row['aliveAtEnd'];b['guardianAssigned']+=row['guardianAssigned']
  for death in r['deaths']:
   c=death['character'];row=leaders[c];b=row['counts'];status,nominal=guard_status(death,assigned)
   row['death']=dict(cause=death['cause'],boundary=death['boundary'],guardianStatus=status,nominalPreparation=nominal,extraLives=death['before']['extraLives'])
   b['leaderDeaths']+=1;b['deathCause:'+death['cause']]+=1;b['deathGuardianStatus:'+status]+=1
   if status=='active_charged':b['chargedGuardDeathCause:'+death['cause']]+=1
  receipt_seqs=set()
  for t in r['transitions']:
   boundary=t['boundary'];a=boundary['action'];skill=a['skill'] if a and a['type']=='skill' else None
   for e in t['events']:
    if e['kind'] not in ['attack.hit','attack.kill','attack.guarded']:continue
    target=e.get('data',{}).get('target');c=byid[target]['character'] if target in byid else target
    if c not in leaders:continue
    assert e['seq'] not in receipt_seqs;receipt_seqs.add(e['seq']);assert boundary['kind']=='action' and skill
    row=leaders[c];b=row['counts'];pre=next(p for p in t['before'] if p['character']==c);post=next(p for p in t['after'] if p['character']==c)
    assert pre['alive'];category='named' if skill in v.NAMED else 'non_named';b[category+':'+e['kind']]+=1
    if e['kind']=='attack.guarded':
     assert category=='named' and post['alive'] and pre['extraLives']==post['extraLives']
     g,h=pre['externalProtection'],post['externalProtection'];assert g and h and g['alive'] and g['bodyguard'] and g['charges']>0 and h['charges']==g['charges']-1
    elif e['kind']=='attack.hit':assert pre['extraLives']>0 and post['alive'] and post['extraLives']==pre['extraLives']-1
    else:assert not post['alive'] and any(d['victim']==pre['id'] and d['boundary']==boundary for d in r['deaths'])
    if category=='non_named':
     g,h=pre['externalProtection'],post['externalProtection']
     if g and g['alive'] and g['bodyguard'] and g['charges']>0:
      assert h and h['charges']==g['charges'];b['nonNamedWithChargedGuard:'+e['kind']]+=1
    row['attackReceipts'].append(dict(seq=e['seq'],kind=e['kind'],skill=skill,category=category,boundary=boundary,extraLivesBefore=pre['extraLives'],extraLivesAfter=post['extraLives']))
  for c,row in leaders.items():
   b=row['counts'];assert b['leaderSurvived']+b['leaderDeaths']==1
   assert sum(n for k,n in b.items() if k.startswith('deathGuardianStatus:'))==b['leaderDeaths']
   for count in [0,f['count']]:buckets.setdefault((r['variant'],count,c),collections.Counter()).update(b)
  games.append(dict(variant=r['variant'],fixture=f,winner=r['winner'],assignedCharacters=sorted(assigned),commanders=[leaders[c] for c in sorted(leaders)]))
 assert len(games)==expected_games
 for s in verified['summary']:
  for c in v.COMMANDERS:
   b=buckets[(s['variant'],s['count'],c)];assert b['games']==s['counts']['games'] and b['leaderDeaths']==s['counts'].get('death:'+c,0)
   for k,n in s['counts'].items():
    if k.startswith('cause:'+c+':'):assert b['deathCause:'+k.split(':',2)[2]]==n
 return dict(kind='protector-coverage-and-damage-scope',newResearchExecutions=0,newReplayedGames=0,analyzedGames=expected_games,games=games,summary=[dict(variant=k[0],count=k[1],character=k[2],counts=b) for k,b in sorted(buckets.items())],limitations=[f'All{expected_games} existing synthetic-bot paths; no counterfactual policy/skill intervention.','Guardian absent at assignment is not AI non-use.','Death-time nominal readiness excludes identity, legal target, and actual choice timing; not an opportunity denominator.','Named guard absorption, extra-life loss and bypass deaths are different outcomes.','Count/assignment conditioned outcomes do not estimate the causal effect of adding a role.','Human matches zero; policies and skill numbers unchanged.'])
def run(raw,trace,summary,out,source_ref):
 assert len(source_ref)==40 and set(source_ref)<=set('abcdef0123456789')
 a,b,c=v.read(raw),v.read(trace),pathlib.Path(summary).read_bytes();assert v.sha(a)=='3660f8ce495e8789e011171ca23ceec9a1f97825e90a1020ba3d1d415ca0e822' and v.sha(b)=='5ebe9e06cabb7077f016b43861775db30f4a42d4eab0308f7b99bf4a2654f62f'
 original,replay,verified=map(json.loads,[a,b,c]);assert verified['snapshotSHA256']==v.sha(b)
 result=analyze(original,replay,verified);result.update(input045SHA256=v.sha(a),input047SHA256=v.sha(b),verified047SHA256=v.sha(c),analysisSHA256=v.sha(pathlib.Path(__file__).read_bytes()),analysisSourceRef=source_ref,evaluationSourceRef=replay['sourceRef'],optionsSHA256=replay['optionsSHA256'],ruleSourceSHA256=original['sourceHashes']['src/modes/primordial.ts'])
 data=(json.dumps(result,ensure_ascii=False,indent=2)+'\n').encode();pathlib.Path(out).write_bytes(gzip.compress(data,mtime=0))
 short={k:x for k,x in result.items() if k!='games'};pathlib.Path(str(out).replace('.json.gz','-summary.json')).write_text(json.dumps(short,ensure_ascii=False,indent=2)+'\n');return result
if __name__=='__main__':
 if len(sys.argv)!=6:raise SystemExit('045raw.gz 047trace.gz 047summary.json output.json.gz frozenAnalysisSHA')
 r=run(*sys.argv[1:]);print(json.dumps({k:x for k,x in r.items() if k not in ['games','summary']},ensure_ascii=False))
