"""Independent own-view readiness/privacy checker; hidden identity only grades finished choices."""
import collections,gzip,hashlib,json,pathlib,sys
NAMED={'attack','advanced_attack','supreme_attack','soen_chain_murder'}
def enc(x):return json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()
def sha(x):return hashlib.sha256(x).hexdigest()
def read(p):
 b=pathlib.Path(p).read_bytes();return gzip.decompress(b) if str(p).endswith('.gz') else b
def own_guard(view,known):
 me=view['me'];key,name={'consume':('consume_master_guard','eltas'),'kumarin':('kumarin_commander_guard','rael')}[me['character']];skills=me['skills'];skill=next((s for s in skills if s['key']==key),None)
 target=next((p for p in view['players'] if known.get(p['id'])==name),None);roles={r['key']:r for r in view['roster']}
 enemies=[p for p in view['players'] if p['alive'] and not any(e['kind']=='invulnerable' for e in p['statuses']) and p['id'] in known and roles[known[p['id']]]['side']!=me['side']]
 reserved=[dict(skill=s['key'],cost=s['mana'],cooldown=s['cooldownRemainingMs']) for s in skills if s['key'] in NAMED and 0<s['cooldownRemainingMs']<=20000 and me['mana']>=s['mana'] and any(known[p['id']] in (s['nameOptions'] or []) for p in enemies)]
 reserve=max([0]+[s['cost'] for s in reserved]);usable={s['key']:s for s in skills if not s['passive'] and s['blocked'] is None and (s['key'] in NAMED or s['key']=='break_ally' or s['mana']<=me['mana']-reserve)}
 if not skill or skill['passive'] or skill['blocked'] is not None or skill['usesLeft']==0 or skill['cooldownRemainingMs']>0 or me['mana']<skill['mana']:reason='skill_unavailable'
 elif not target:reason='identity_unconfirmed'
 elif not target['alive']:reason='known_target_dead'
 elif any(e['kind']=='invulnerable' for e in target['statuses']) and not skill['ignoresInvulnerable']:reason='known_target_protected'
 elif skill['mana']>me['mana']-reserve:reason='attack_reserve'
 else:reason='own_guard_ready'
 suggestion=dict(type='skill',skill=key,target=target['id']) if reason=='own_guard_ready' and key in usable and roles[name]['commander'] and roles[name]['side']==me['side'] else None
 assert (suggestion is not None)==(reason=='own_guard_ready')
 return dict(guardSkill=key,targetRole=name,skill=skill,target=target['id'] if target else None,targetAlive=target['alive'] if target else None,reserve=reserve,reservedAttacks=reserved,reason=reason,suggestion=suggestion)
def validate_row(r,o):
 g=o['result']['game'];assert r['game']==g and r['fixture']==g['fixture'] and r['variant']==o['variant'] and r['wholeGameAndAllActionsMatched'] and r['originalCollectorMatched']
 assert r['originalRecordSHA256']==sha(enc(o)) and r['matchedActions']==len(o['result']['actions']) and r['originalCollectorPasses']==r['witnessPasses']==1
 assert r['guardCalls']==r['activeCalls']+r['inactiveCalls'] and r['activeCalls']==len(r['decisions'])
 keys=['player','at','action','accepted','error','beforeMana','afterMana','maxMana','nominalMana','character','side','beforeTrueName','beforePublished','receiptKinds'];assert r['actionsSHA256']==sha(enc([{k:a[k] for k in keys} for a in o['result']['actions']]))
 roles={p['id']:p for p in o['roles']};counts=collections.Counter();seen=set()
 for d in r['decisions']:
  key=(d['player'],d['at']);assert key not in seen;seen.add(key);p=d['player'];view=d['view'];me=view['me'];known=dict(d['known']);assert len(known)==len(d['known'])
  assert me['id']==p and me['character']==roles[p]['character'] and me['alive'] and view['phase']=='running' and view['elapsedMs']==d['at']
  assert me['character'] in ['consume','kumarin'] and d['memoryUnchanged'] and d['engineUnchanged']
  for other in view['players']:assert not {'mana','skills','flags','extraLives','character'}&set(other)
  for e in d['events']:assert e['vis']['to']=='all' or e['vis']['to']=='players' and p in e['vis']['ids']
  assert d['diagnostic']==own_guard(view,known)
  assert d['selected']==(d['diagnostic']['suggestion'] is not None and d['chosenAction']==d['diagnostic']['suggestion'])
  i=d['beforeAppliedActions'];assert 0<=i<=len(o['result']['actions'])
  if d['chosenAction'] is not None:
   a=o['result']['actions'][i];assert a['player']==p and a['at']==d['at'] and a['action']==d['chosenAction'] and a['activeDecision']
  else:assert not any(a['player']==p and a['at']==d['at'] and a['activeDecision'] and a['action']['type']!='chat' for a in o['result']['actions'])
  c=counts;c['activeChoices']+=1;c['reason:'+d['diagnostic']['reason']]+=1;c['selected']+=d['selected']
  c['wrongKnownEntryRows']+=sum(roles[t]['character']!=n for t,n in known.items())
  suggestion=d['diagnostic']['suggestion']
  if suggestion:
   c['eligibleOwnGuard']+=1;c['wrongGuardSuggestion']+=roles[suggestion['target']]['character']!=d['diagnostic']['targetRole']
   a=d['chosenAction'];kind='selected' if d['selected'] else 'idle' if a is None else 'named_attack' if a['type']=='skill' and a['skill'] in NAMED else 'ally' if a['type']=='skill' and a['skill']=='ally' else 'other'
   c['eligibleChoice:'+kind]+=1
   if d['selected']:
    receipt=o['result']['actions'][i];c['selectedAccepted']+=receipt['accepted'];c['selectedCorrectOutcome']+=('skill.'+suggestion['skill']) in receipt['receiptKinds']
 return counts
def verify(path,raw045,raw047,journal,pub):
 a,b=read(raw045),read(raw047);assert sha(a)=='3660f8ce495e8789e011171ca23ceec9a1f97825e90a1020ba3d1d415ca0e822' and sha(b)=='5ebe9e06cabb7077f016b43861775db30f4a42d4eab0308f7b99bf4a2654f62f'
 original,trace=json.loads(a),json.loads(b);blob=read(path);d=json.loads(blob);j=read(journal);publication=json.loads(read(pub))
 meta={k:x for k,x in d.items() if k not in ['fingerprint','executions','complete','records','journalSha256']};assert d['kind']=='own-guard-choice-witness' and d['input045SHA256']==sha(a) and d['optionsSHA256']==original['optionsSHA256'] and d['settings']==original['settings'] and d['newResearchExecutions']==0
 assert sha(enc(meta))==d['fingerprint'] and d['complete'] and d['executions']==len(d['records'])==4
 lines=j.splitlines();assert json.loads(lines[0])==dict(type='header',fingerprint=d['fingerprint'],meta=meta) and [json.loads(x) for x in lines[1:]]==d['records']
 assert sha(j)==d['journalSha256']==publication['journalSHA256'] and sha(blob)==publication['snapshotSHA256'] and publication['executions']==4 and publication['complete'] and publication['fingerprint']==d['fingerprint'] and publication['version']==2
 for p,h in d['sourceHashes'].items():assert sha(pathlib.Path('packages/rules',p).read_bytes())==h
 for p,h in d['verificationHashes'].items():assert sha(pathlib.Path(p).read_bytes())==h
 selected=[o for o in original['records'] if o['result']['game']['fixture']['count']==12 and (o['result']['game']['fixture']['seed']==151009 and o['result']['game']['fixture']['reversed'] or o['result']['game']['fixture']['seed']==151014 and not o['result']['game']['fixture']['reversed'])];assert len(selected)==4
 rows=[];last=[]
 for r,o in zip(d['records'],selected):
  counts=validate_row(r,o);rows.append(dict(variant=r['variant'],fixture=r['fixture'],counts=counts))
  f=r['fixture'];t=next(t for t in trace['records'] if t['variant']==r['variant'] and t['fixture']==f);roles={p['character']:p for p in o['roles']}
  for c,guardian in [('eltas','consume'),('rael','kumarin')]:
   death=next((x for x in t['deaths'] if x['character']==c),None)
   if death is None:continue
   cutoff=death['boundary']['actionIndex'];assert cutoff is not None
   choices=[x for x in r['decisions'] if x['player']==roles[guardian]['id'] and x['beforeAppliedActions']<=cutoff]
   # Later timestamps cannot precede this death; action ordinal disambiguates same tick.
   assert all(x['at']<=death['boundary']['at'] for x in choices)
   last.append(dict(variant=r['variant'],fixture=f,commander=c,deathAt=death['boundary']['at'],deathCause=death['cause'],guardian=guardian,activeChoicesBeforeDeath=len(choices),lastActiveChoice=choices[-1] if choices else None))
 return dict(kind=d['kind'],sourceRef=d['sourceRef'],uniqueReplayedGames=4,originalCollectorPasses=4,witnessPasses=4,newResearchExecutions=0,rows=rows,lastChoicesBeforeDeaths=last,snapshotSHA256=sha(blob),input045SHA256=sha(a),optionsSHA256=d['optionsSHA256'],limitations=['Selected by048 full census of nominal-readiness cases, not independent performance evidence.','Full actual games/actions/resources matched; diagnostics did not select actions.','Own guard readiness is a feasible proposal, not proof that it outranks every attack/growth action.','Wrong known-name entries are external grading only, never policy input.','Synthetic bots only; no new human or win-rate evidence.'])
if __name__=='__main__':
 if len(sys.argv)!=7:raise SystemExit('snapshot raw045 raw047 journal publication summary-output')
 result=verify(*sys.argv[1:6]);pathlib.Path(sys.argv[6]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:x for k,x in result.items() if k not in ['rows','lastChoicesBeforeDeaths']},ensure_ascii=False))
