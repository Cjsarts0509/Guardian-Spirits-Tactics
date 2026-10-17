"""Independent own-view gate/entropy/receipt validation, not a policy or a new belief model."""
import collections,importlib.util,json,math,pathlib,sys,subprocess
spec=importlib.util.spec_from_file_location('intel_v',pathlib.Path(__file__).with_name('verify-own-share-witness.py'));base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
enc,sha,read=base.enc,base.sha,base.read
NAMED={'attack','advanced_attack','supreme_attack','soen_chain_murder'}
CHECKS={'advanced_ally_check','ally_check','advanced_enemy_check','enemy_check'}
SCANS={'advanced_scan','scan','ally_scan','enemy_scan','troll_scan','troll_ally_scan','troll_enemy_scan'}
def close(a,b):
 if isinstance(a,dict):return isinstance(b,dict) and set(a)==set(b) and all(close(a[k],b[k]) for k in a)
 if isinstance(a,list):return isinstance(b,list) and len(a)==len(b) and all(close(x,y) for x,y in zip(a,b))
 if isinstance(a,float):return isinstance(b,(int,float)) and math.isfinite(b) and math.isclose(a,b,rel_tol=1e-10,abs_tol=1e-10)
 return a==b
def diagnose(d):
 view=d['view'];assert view['mode']=='primordial';me=view['me'];known=dict(d['known']);candidates=dict(d['candidates']);roles={r['key']:r for r in view['roster']};players={p['id']:p for p in view['players']};reports={t:dict(v) for t,v in d['intel']['reports']};diag=d['diagnostic']
 # Primordial has no absolute named-attack guard table, disguises or hiddenFromChecks.
 enemies=[p for p in view['players'] if p['alive'] and not any(s['kind']=='invulnerable' for s in p['statuses']) and p['id'] in known and roles[known[p['id']]]['side']!=me['side']]
 reserved=[dict(skill=s['key'],cost=s['mana'],cooldown=s['cooldownRemainingMs']) for s in me['skills'] if s['key'] in NAMED and 0<s['cooldownRemainingMs']<=20000 and me['mana']>=s['mana'] and any(known[p['id']] in (s['nameOptions'] or []) for p in enemies)]
 reserve=max([0]+[s['cost'] for s in reserved]);usable=[s for s in me['skills'] if not s['passive'] and s['blocked'] is None and (not reserve or s['key'] in NAMED or s['key']=='break_ally' or s['mana']<=me['mana']-reserve)]
 def useful(sender):
  return any(p['alive'] and p['id'] not in [me['id'],sender] and not p['revealed'] and p['id'] in known for p in view['players']) or any(sender in rs and players[t]['alive'] and t!=me['id'] and t not in known and rs[sender]['character'] in candidates.get(t,[]) for t,rs in reports.items())
 def commander_report(sender):
  return sender!=me['id'] and sender not in known and sender in me['alliedBy'] and players[sender]['alive'] and any(sender in rs and t!=me['id'] and t not in known and players[t]['alive'] and roles[rs[sender]['character']]['inGame'] and roles[rs[sender]['character']]['commander'] and rs[sender]['character'] in candidates.get(t,[]) for t,rs in reports.items())
 senders=[];ids=list(dict.fromkeys(s for rs in reports.values() for s in rs))
 for sender in ids:
  p=players[sender];senders.append(dict(id=sender,known=known.get(sender),alive=p['alive'],protected=any(e['kind']=='invulnerable' for e in p['statuses']),incomingAlly=sender in me['alliedBy'],useful=useful(sender),commanderReport=commander_report(sender),reports=[dict(target=t,**rs[sender],targetKnown=known.get(t),compatible=rs[sender]['character'] in candidates.get(t,[])) for t,rs in reports.items() if sender in rs]))
 incoming=[p for p in view['players'] if p['alive'] and p['id']!=me['id'] and not any(e['kind']=='invulnerable' for e in p['statuses']) and p['id'] not in known and p['id'] in me['alliedBy'] and commander_report(p['id'])]
 probabilities={p:dict(rs) for p,rs in diag['probabilities']};assert len(probabilities)==len(diag['probabilities'])
 for p,rs in probabilities.items():
  assert p in players and all(r in roles and math.isfinite(x) and 0<=x<=1+1e-10 for r,x in rs.items())
  if diag['beliefConsistent']:assert math.isclose(sum(rs.values()),1,abs_tol=1e-9)
  if p!=me['id']:assert all(x<=1e-12 or r in candidates[p] for r,x in rs.items())
 def info(player,skill,name=None):
  rs=probabilities.get(player,{})
  if skill=='truth_gem':
   masses=collections.defaultdict(float)
   for r,p in rs.items():masses['#commander' if roles[r]['commander'] else r]+=p
   return sum(-p*math.log2(p) for p in masses.values() if 1e-12<p<1-1e-12)
  published=players[player]['published'];success=0
  for r,p in rs.items():
   ok=(r==name) if skill in SCANS else (r==published and roles[r]['side']==me['side']) if skill in ['ally_check','advanced_ally_check'] else (r==published and roles[r]['side']!=me['side'])
   if ok:success+=p
  return -success*math.log2(success)-(1-success)*math.log2(1-success) if 1e-12<success<1-1e-12 else 0
 checks=[]
 if diag['beliefConsistent']:
  for s in usable:
   if s['key'] not in CHECKS|SCANS or s['cooldownRemainingMs']>0 or s['mana']>me['mana'] or s['usesLeft']==0:continue
   for p in incoming:
    for name in (s['nameOptions'] or []) if s['key'] in SCANS else [None]:
     information=info(p['id'],s['key'],name);score=information/(1+s['mana']/50+s['cooldown']/60)
     if score>0:
      action=dict(type='skill',skill=s['key'],target=p['id'])
      if name is not None:action['name']=name
      checks.append(dict(action=action,score=score))
 checks.sort(key=lambda x:-x['score']);commanders=[]
 for e in d['events']:
  for f in e.get('facts',[]):
   if f.get('commander') and f['player']!=me['id'] and f['player'] not in commanders:commanders.append(f['player'])
 gems=[dict(target=p['id'],information=info(p['id'],'truth_gem')) for p in incoming if p['id'] not in commanders and info(p['id'],'truth_gem')>0] if any(s['key']=='truth_gem' for s in usable) else []
 proposal=checks[0]['action'] if checks else dict(type='skill',skill='truth_gem',target=gems[0]['target']) if gems else None
 return dict(reserve=reserve,reservedAttacks=reserved,usableKeys=[s['key'] for s in usable],senders=senders,incoming=[p['id'] for p in incoming],beliefConsistent=diag['beliefConsistent'],probabilities=diag['probabilities'],knownCommanderIDs=commanders,checks=checks,gemCandidates=gems,proposal=proposal)
def validate_row(r,o):
 assert r['fixture']==o['result']['game']['fixture'] and r['game']==o['result']['game'] and r['variant']==o['variant'] and r['wholeGameAndAllActionsMatched'] and r['originalCollectorMatched']
 assert r['originalRecordSHA256']==sha(enc(o)) and r['matchedActions']==len(o['result']['actions']) and r['originalCollectorPasses']==r['witnessPasses']==1
 assert r['observedRoleCalls']==r['activeCalls']+r['inactiveCalls'] and r['activeCalls']==len(r['decisions'])
 keys=['player','at','action','accepted','error','beforeMana','afterMana','maxMana','nominalMana','character','side','beforeTrueName','beforePublished','receiptKinds'];actions=o['result']['actions'];assert r['actionsSHA256']==sha(enc([{k:a[k] for k in keys} for a in actions]))
 roles={p['id']:p for p in o['roles']};previous={};counts=collections.Counter()
 for d in r['decisions']:
  p=d['player'];view=d['view'];known=dict(d['known']);ordinal=d['beforeAppliedActions'];assert len(known)==len(d['known']) and view['me']['id']==p and view['me']['character']==roles[p]['character'] and view['me']['character'] in ['drakan','kilder'] and view['me']['alive'] and view['phase']=='running' and view['elapsedMs']==d['at'] and 0<=ordinal<=len(actions)
  assert d['memoryUnchanged'] and d['engineUnchanged'] and d['actualMemoryMatchesBaseline']
  for q in view['players']:assert not {'mana','skills','flags','character','extraLives'}&set(q)
  seqs=[e['seq'] for e in d['events']];assert seqs==sorted(set(seqs))
  for e in d['events']:assert e['at']<=d['at'] and (e['vis']['to']=='all' or e['vis']['to']=='players' and p in e['vis']['ids'])
  if p in previous:
   old=previous[p];assert d['at']>old['at'] and ordinal>=old['beforeAppliedActions'] and d['events'][:len(old['events'])]==old['events']
  previous[p]=d;base.verify_intel(d);assert close(diagnose(d),d['diagnostic'])
  a=d['chosenAction'];alt=d['alternative'];proposal=d['diagnostic']['proposal'];assert d['changed']==(a!=alt) and d['proposalMatchesAlternative']==(proposal is not None and proposal==alt)
  if a is not None:
   actual=actions[ordinal];assert actual['player']==p and actual['at']==d['at'] and actual['action']==a and actual['beforeMana']==view['me']['mana'] and actual['activeDecision']
  else:assert not any(x['player']==p and x['at']==d['at'] and x['action']['type']!='chat' and x['activeDecision'] for x in actions)
  counts['activePrimaryChoices']+=1;counts['incomingEligibleChoices']+=bool(d['diagnostic']['incoming']);counts['proposalChoices']+=proposal is not None;counts['proposalMatchesAlternative']+=d['proposalMatchesAlternative'];counts['changedChoices']+=d['changed']
  probe=d['probe'];assert (probe is not None)==(d['changed'] and alt is not None)
  if probe:
   assert alt==proposal and alt['target'] in d['diagnostic']['incoming'];assert probe['beforeMana']==view['me']['mana'] and probe['afterMana']>=0
   assert (probe['error'] is None) if probe['accepted'] else isinstance(probe['error'],str)
   assert probe['targetKnownAfter']==dict(probe['knownAfter']).get(alt['target'])
   cost=next(s['mana'] for s in view['me']['skills'] if s['key']==alt['skill'])
   assert probe['afterMana']==probe['beforeMana']-(cost if probe['accepted'] else 0)
   afterKnown=dict(probe['knownAfter']);afterCandidates=dict(probe['candidatesAfter']);expectedTrusted={}
   for target,rs in {t:dict(v) for t,v in d['intel']['reports']}.items():
    if target==p or target in afterKnown or not next(q for q in view['players'] if q['id']==target)['alive']:continue
    names=set();contradiction=False
    for sender,report in rs.items():
     role=afterKnown.get(sender);peer=next(q for q in view['players'] if q['id']==sender)
     if role is None or not peer['alive'] or not any(x['key']==role and x['side']==view['me']['side'] for x in view['roster']):continue
     names.add(report['character']);contradiction|=report['character'] not in afterCandidates.get(target,[])
    if not contradiction and len(names)==1:expectedTrusted[target]=next(iter(names))
   assert dict(probe['trustedReportsAfter'])==expectedTrusted
   counts['counterfactualTrustedReports']+=len(expectedTrusted)
   for e in probe['ownEvents']:assert e['vis']['to']=='all' or e['vis']['to']=='players' and p in e['vis']['ids']
   counts['counterfactualProbes']+=1;counts['counterfactualAccepted']+=probe['accepted'];counts['counterfactualConfirmedSender']+=probe['targetKnownAfter'] is not None
  # External truth only after all projections and choices; never passed to diagnose.
  counts['wrongKnownEntries']+=sum(roles[t]['character']!=name for t,name in known.items())
 return counts
def focus_rows(r,o,trace):
 ids={p['character']:p['id'] for p in o['roles']};death=next((d for d in trace['deaths'] if d['character']=='eltas'),None);cut=death['boundary']['actionIndex'] if death else len(o['result']['actions']);rows=[]
 for d in r['decisions']:
  if d['player']!=ids['drakan'] or d['beforeAppliedActions']>cut:continue
  sender=next((s for s in d['diagnostic']['senders'] if s['id']==ids['kilder']),None);report=next((x for x in sender['reports'] if x['target']==ids['eltas']),None) if sender else None
  rows.append(dict(at=d['at'],beforeAppliedActions=d['beforeAppliedActions'],mana=d['view']['me']['mana'],reportObserved=report is not None,senderKnown=sender['known'] if sender else None,incoming=sender['incomingAlly'] if sender else None,useful=sender['useful'] if sender else None,eligibleSender=ids['kilder'] in d['diagnostic']['incoming'],proposal=d['diagnostic']['proposal'],chosenAction=d['chosenAction'],alternative=d['alternative'],changed=d['changed'],probe=d['probe']))
 return dict(variant=r['variant'],fixture=r['fixture'],deathAt=death['boundary']['at'] if death else None,activeChoices=len(rows),reportObservedChoices=sum(x['reportObserved'] for x in rows),rows=rows)
def verify(path,original_path,deaths_path,journal,pub):
 ob=read(original_path);tb=read(deaths_path);assert sha(ob)=='3660f8ce495e8789e011171ca23ceec9a1f97825e90a1020ba3d1d415ca0e822' and sha(tb)=='5ebe9e06cabb7077f016b43861775db30f4a42d4eab0308f7b99bf4a2654f62f'
 original=json.loads(ob);traces=json.loads(tb);blob=read(path);d=json.loads(blob);j=read(journal);p=json.loads(read(pub));meta={k:v for k,v in d.items() if k not in ['fingerprint','executions','complete','records','journalSha256']}
 assert d['kind']=='commander-report-sender-witness' and d['input045SHA256']==sha(ob) and d['optionsSHA256']==original['optionsSHA256'] and d['settings']==original['settings'] and d['newResearchExecutions']==0
 assert sha(enc(meta))==d['fingerprint'] and d['complete'] and d['executions']==len(d['records'])==4
 lines=j.splitlines();assert json.loads(lines[0])==dict(type='header',fingerprint=d['fingerprint'],meta=meta) and [json.loads(x) for x in lines[1:]]==d['records']
 assert sha(j)==d['journalSha256']==p['journalSHA256'] and sha(blob)==p['snapshotSHA256'] and p['executions']==4 and p['complete'] and p['fingerprint']==d['fingerprint'] and p['version']==2
 assert d['legacySourceRef']=='3bafb562897e480b7935a3718f713d5931a088aa' and d['candidateOptions']=={'verifyIncomingAllies':'commander-report'} and d['candidateOptionsSHA256']==sha(enc(d['candidateOptions'])) and d['actualCandidateGames']==0
 for file,delta in d['policyDeltaFiles'].items():
  assert file in ['src/bot.ts','src/bot-intel.ts'] and delta['legacySHA256']==original['sourceHashes'][file]
  assert sha(subprocess.check_output(['git','show',d['legacySourceRef']+':packages/rules/'+file]))==delta['legacySHA256']
  assert sha(pathlib.Path('packages/rules',file).read_bytes())==delta['currentSHA256']
 for file,h in d['sourceHashes'].items():assert sha(pathlib.Path('packages/rules',file).read_bytes())==h
 for file,h in d['verificationHashes'].items():assert sha(pathlib.Path(file).read_bytes())==h
 selected=[o for o in original['records'] if o['result']['game']['fixture']['count']==12 and (o['result']['game']['fixture']['seed']==151009 and o['result']['game']['fixture']['reversed'] or o['result']['game']['fixture']['seed']==151014 and not o['result']['game']['fixture']['reversed'])];assert len(selected)==4
 rows=[];focus=[];total=collections.Counter()
 for r,o in zip(d['records'],selected):
  counts=validate_row(r,o);total.update(counts);rows.append(dict(variant=r['variant'],fixture=r['fixture'],counts=counts));t=next(t for t in traces['records'] if t['variant']==r['variant'] and t['fixture']==r['fixture']);focus.append(focus_rows(r,o,t))
 return dict(kind=d['kind'],sourceRef=d['sourceRef'],candidateOptionsSHA256=d['candidateOptionsSHA256'],actualCandidateGames=0,uniqueReplayedGames=4,originalCollectorPasses=4,witnessPasses=4,newResearchExecutions=0,rows=rows,totals=total,focus=focus,snapshotSHA256=sha(blob),input045SHA256=sha(ob),optionsSHA256=d['optionsSHA256'],limitations=['Four selected synthetic games, not independent performance evidence.','Entropy rechecked from recorded own belief; assignment DP itself is covered by existing engine tests, not independently retrained.','Changed alternatives are isolated immediate clone probes, not actual changes or follow-up wins.'])
if __name__=='__main__':
 if len(sys.argv)!=7:raise SystemExit('snapshot original045 deaths047 journal publication summary-output')
 result=verify(*sys.argv[1:6]);pathlib.Path(sys.argv[6]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['rows','focus','limitations']},ensure_ascii=False))
