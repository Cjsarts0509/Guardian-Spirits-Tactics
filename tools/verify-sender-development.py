"""Independent own-view gate/entropy/receipt validation, not a policy or a new belief model."""
import collections,importlib.util,json,math,pathlib,sys,subprocess,random,re
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
def trusted(view,known,candidates,reports):
 result=[];roles={r['key']:r for r in view['roster']};players={p['id']:p for p in view['players']}
 for target,rs in reports.items():
  if target==view['me']['id'] or target in known or not players[target]['alive']:continue
  names=set();contradiction=False
  for sender,report in rs.items():
   role=known.get(sender)
   if role is None or roles[role]['side']!=view['me']['side'] or not players[sender]['alive']:continue
   contradiction|=report['character'] not in candidates.get(target,[]);names.add(report['character'])
  if not contradiction and len(names)==1:result.append([target,next(iter(names))])
 return result
def diagnose(d):
 view=d['view'];rules=RULES[view['mode']];me=view['me'];known=dict(d['known']);candidates=dict(d['candidates']);roles={r['key']:r for r in view['roster']};players={p['id']:p for p in view['players']};reports={t:dict(v) for t,v in d['intel']['reports']};diag=d['diagnostic']
 # All conditions below use public mode rules and own inputs only.
 enemies=[p for p in view['players'] if p['alive'] and not any(s['kind']=='invulnerable' for s in p['statuses']) and p['id'] in known and roles[known[p['id']]]['side']!=me['side'] and not any(g not in {q['revealed'] for q in view['players'] if not q['alive'] and q['revealed']} for g in rules['guards'].get(known[p['id']],[]))]
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
 def check_success(role,skill,published,name=None):
  disguised=published is not None and any(r['character']==role and r['fooledSide']==me['side'] and roles[role]['side']!=me['side'] and roles[published]['side']==me['side'] for r in rules['disguises'])
  if skill in SCANS:return bool(name) and name not in rules['hiddenFromChecks'] and (name==role or disguised and name==published)
  if role in rules['hiddenFromChecks']:return False
  if skill in ['ally_check','advanced_ally_check']:return disguised or role==published and roles[role]['side']==me['side']
  return role==published and roles[role]['side']!=me['side']
 def info(player,skill,name=None):
  rs=probabilities.get(player,{})
  if skill=='truth_gem':
   masses=collections.defaultdict(float)
   for r,p in rs.items():masses['#commander' if roles[r]['commander'] else r]+=p
   return sum(-p*math.log2(p) for p in masses.values() if 1e-12<p<1-1e-12)
  published=players[player]['published'];success=0
  for r,p in rs.items():
   ok=check_success(r,skill,published,name)
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
 trusted_reports=trusted(view,known,candidates,reports);prior=None
 for target,name in sorted(trusted_reports,key=lambda pair:-(roles[pair[1]]['side']!=me['side'])):
  p=players[target]
  for key in ['advanced_scan','scan','ally_scan','enemy_scan','troll_scan','troll_ally_scan','troll_enemy_scan']:
   skill=next((s for s in usable if s['key']==key),None)
   if skill and name in (skill['nameOptions'] or []) and len({check_success(c,key,p['published'],name) for c in candidates.get(target,[])})>1 and (skill['ignoresInvulnerable'] or not any(e['kind']=='invulnerable' for e in p['statuses'])):
    prior=dict(type='skill',skill=key,target=target,name=name);break
  if prior:break
  gem=next((s for s in usable if s['key']=='truth_gem'),None)
  if gem and not roles[name]['commander'] and (gem['ignoresInvulnerable'] or not any(e['kind']=='invulnerable' for e in p['statuses'])):
   prior=dict(type='skill',skill='truth_gem',target=target);break
 prior_name=dict(trusted_reports).get(prior['target']) if prior else None
 competes=proposal is not None and prior_name is not None and not roles[prior_name]['commander']
 return dict(priorTrustedVerification=prior,trustedReports=trusted_reports,ordinaryReportCompetes=competes,reserve=reserve,reservedAttacks=reserved,usableKeys=[s['key'] for s in usable],senders=senders,incoming=[p['id'] for p in incoming],beliefConsistent=diag['beliefConsistent'],probabilities=diag['probabilities'],knownCommanderIDs=commanders,checks=checks,gemCandidates=gems,proposal=proposal)

RULES={}

def validate_record(r):
 f=r['fixture'];g=r['game'];assert g['winner'] in [None,1,2] and 0<g['elapsedMs']<=5400000
 assert g['fixture']==f and g['winnerPolicy']==(None if g['winner'] is None else 'current' if g['winner']==f['currentSide'] else 'reference')
 roles={p['id']:p for p in r['roles']};assert len(roles)==f['count'] and len({p['character'] for p in roles.values()})==f['count']
 actions=r['actions'];current=[a for a in actions if a['side']==f['currentSide']]
 for side,label in [(f['currentSide'],'current'),(3-f['currentSide'],'reference')]:
  aa=[a for a in actions if a['side']==side];stat=g['stats'][label];assert stat['attempted']==len(aa) and stat['accepted']==sum(a['accepted'] for a in aa) and stat['rejected']==sum(not a['accepted'] for a in aa)
 for a in actions:
  assert a['side']==roles[a['player']]['side'] and a['character']==roles[a['player']]['character'] and 0<=a['at']<=g['elapsedMs'] and 0<=a['beforeMana']<=a['maxMana'] and 0<=a['afterMana']<=a['maxMana']
  assert a['accepted']==(a['error'] is None)
  grade=a['grade']
  if grade['reportTarget']:
   assert a['action']['type']=='chat';assert grade['reportActualName']==roles[grade['reportTarget']]['character']
   match=re.fullmatch(r'확인 정보: \[(\d{1,2})\] (.+)',a['action']['text']);assert match and int(match[1])==roles[grade['reportTarget']]['seat']
   assert grade['reportedName']==next((q['character'] for q in roles.values() if q['name']==match[2]),None)
 expected=dict(nominalSkillMana=sum(a['nominalMana'] for a in current if a['accepted'] and a['action']['type']=='skill'),netSkillManaDelta=sum(a['afterMana']-a['beforeMana'] for a in current if a['accepted'] and a['action']['type']=='skill'),attackFailures=sum('attack.fail.self' in a['receiptKinds'] for a in current),rejected=sum(not a['accepted'] for a in current),reports=sum(a['grade']['reportTarget'] is not None for a in current),falseReports=sum(a['grade']['reportTarget'] is not None and (a['grade']['reportKnownName']!=a['grade']['reportActualName'] or a['grade']['reportedName']!=a['grade']['reportActualName']) for a in current))
 assert expected==r['resources']
 counts=collections.Counter();seen=set()
 for d in r['decisions']:
  v=d['view'];p=d['player'];known=dict(d['known']);assert v['me']['id']==p and v['me']['side']==f['currentSide'] and v['me']['character']==roles[p]['character'] and d['at']==v['elapsedMs'] and d['memoryUnchanged']
  assert (p,d['at']) not in seen;seen.add((p,d['at']))
  for q in v['players']:assert not {'mana','character','flags','skills','extraLives'}&set(q)
  for e in d['events']:assert e['at']<=d['at'] and (e['vis']['to']=='all' or e['vis']['to']=='players' and p in e['vis']['ids'])
  assert [e['seq'] for e in d['events']]==sorted({e['seq'] for e in d['events']});base.verify_intel(d)
  assert close(diagnose(d),d['diagnostic'])
  proposal=d['diagnostic']['proposal'];a=d['chosenAction'];assert d['selected']==(proposal is not None and proposal==a) and d['changed']==(a!=d['originalAction'])
  if r['variant']=='control':assert not d['changed'] and d['originalAfterRng']==d['chosenAfterRng']
  if d['changed']:assert r['variant']=='candidate' and d['selected']
  if a is not None:
   actual=actions[d['ordinal']];assert actual['player']==p and actual['at']==d['at'] and actual['action']==a and actual['activePrimary']
  counts['sameActionDifferentRng']+=not d['changed'] and d['originalAfterRng']!=d['chosenAfterRng'];counts['policyDivergenceSignals']+=d['changed'] or d['originalAfterRng']!=d['chosenAfterRng'];counts['incomingEligibleChoices']+=1;counts['resourceProposals']+=proposal is not None;counts['selected']+=d['selected'];counts['changed']+=d['changed'];counts['wrongKnownFromSavedDecisions']+=sum(roles[t]['character']!=name for t,name in known.items())
  receipt=d['receipt'];assert (receipt is not None)==d['selected']
  if receipt:
   actual=actions[d['ordinal']];assert receipt['accepted']==actual['accepted'] and receipt['error']==actual['error'] and receipt['beforeMana']==actual['beforeMana'] and receipt['afterMana']==actual['afterMana']
   for e in receipt['ownEvents']:assert e['at']==d['at'] and (e['vis']['to']=='all' or e['vis']['to']=='players' and p in e['vis']['ids'])
   ak=dict(receipt['knownAfter']);ac=dict(receipt['candidatesAfter']);tr=trusted(v,ak,ac,{t:dict(x) for t,x in d['intel']['reports']})
   assert dict(receipt['trustedReportsAfter'])==dict(tr)
   sender=a['target'];counts['accepted']+=receipt['accepted'];counts['immediateConfirmed']+=sender in ak;counts['wrongKnownAfter']+=sum(roles[t]['character']!=name for t,name in ak.items())
   if receipt['accepted'] and sender in ak:
    exact=any(z.get('player')==sender and z.get('character')==ak[sender] for e in receipt['ownEvents'] for z in e.get('facts',[]))
    counts['exactIdentityReceipts']+=exact;counts['constraintConfirmed']+=not exact
    if a['skill']=='truth_gem':
     assert ac[sender]==[ak[sender]]
     assert exact or any(z.get('player')==sender and z.get('commander') and any(c['key']==ak[sender] and c['commander'] for c in v['roster']) for e in receipt['ownEvents'] for z in e.get('facts',[]))
 for key in ['incomingEligibleChoices','resourceProposals','selected','changed']:assert r['counters'][key]==counts[key]
 assert r['counters']['activeChoices']>=len(r['decisions']) and r['counters']['knownEntriesChecked']>=r['counters']['wrongKnownEntries']>=counts['wrongKnownFromSavedDecisions']
 selected_accepted=[i for i,d in enumerate(r['decisions']) if d['selected'] and d['receipt']['accepted']]
 assert [e['decision'] for e in r['episodes']]==selected_accepted
 for e in r['episodes']:
  d=r['decisions'][e['decision']];assert e['actor']==d['player'] and e['sender']==d['chosenAction']['target'] and e['at']==d['at'] and e['startOrdinal']==d['ordinal'] and e['immediateKnown']==dict(d['receipt']['knownAfter']).get(e['sender'])
  expected_reports=[dict(target=x['target'],name=x['character']) for s in d['diagnostic']['senders'] if s['id']==e['sender'] for x in s['reports'] if x['compatible'] and x['targetKnown'] is None and any(p['id']==x['target'] and p['alive'] for p in d['view']['players']) and any(z['key']==x['character'] and z['commander'] for z in d['view']['roster'])]
  assert e['reports']==expected_reports
  if e['memoryObservedAt'] is not None:assert e['at']<=e['memoryObservedAt']<=g['elapsedMs'] and e['memoryObservedName']==roles[e['sender']]['character']
  for z in e['targetObserved']:assert z['name']==roles[z['target']]['character'] and e['at']<=z['at']<=g['elapsedMs']
 for z in r['followups']:
  e=r['episodes'][z['episode']];a=actions[z['ordinal']];assert z['ordinal']>e['startOrdinal'] and z['at']==a['at'] and z['action']==a['action'] and a['player']==e['actor']
  if z['senderKnownName'] is not None:assert z['senderKnownName']==roles[e['sender']]['character']
  if z['knownName'] is not None:assert z['knownName']==roles[z['target']]['character']
  assert z['kind'] in ['sender_ally','report_consistent_check','report_consistent_attack','direct_known_target_action','direct_known_report_sent']
  if z['kind']=='sender_ally':assert z['target']==e['sender'] and z['action']['skill']=='ally' and z['knownName'] is not None
  else:assert any(t['target']==z['target'] for t in e['reports'])
  if z['kind'].startswith('report_consistent_'):assert z['knownName'] is None and any(t['target']==z['target'] and t['name']==z['trustedName'] for t in e['reports'])
 return counts
def interval(xs):
 rng=random.Random(0x475354);samples=sorted(sum(rng.choices(xs,k=len(xs)))/len(xs) for _ in range(10000));return [samples[250],samples[9749]]
def verify(path,journal,pub,partial=False):
 global RULES
 raw=read(path);d=json.loads(raw);jb=read(journal);p=json.loads(read(pub));RULES=d['publicRules']
 assert RULES=={'civil_war':{'disguises':[{'character':'soen','fooledSide':2}],'hiddenFromChecks':[],'guards':{'kai':['arin'],'dantes':['kelhu']}},'primordial':{'disguises':[],'hiddenFromChecks':[],'guards':{}},'lidellut':{'disguises':[],'hiddenFromChecks':[],'guards':{'kai':['arin']}},'troll':{'disguises':[{'character':'neonis','fooledSide':1}],'hiddenFromChecks':['hachi'],'guards':{'chis':['satoshi','zwinra']}}}
 assert d['settings']==dict(tickMs=250,activity=0.012,limitMs=5400000) and d['design']==dict(unit='seed',fixedOpponent=True,identicalPolicySelfplay=False,playerCount='8+(seed-start)%5',skillValuesChanged=False,promotionEvidence=False)
 assert d['kind']=='commander-sender-development' and d['phase']=='development' and d['variants']==['baseline','control','candidate'] and d['options']==dict(baseline={},control={},candidate={'verifyIncomingAllies':'commander-report-first'})
 assert d['optionsSHA256']==sha(enc(d['options'])) and d['candidateOptionsSHA256']==sha(enc(d['options']['candidate']))
 meta={k:v for k,v in d.items() if k not in ['fingerprint','executions','complete','records','journalSha256']}
 assert d['fingerprint']==sha(enc(meta));lines=jb.splitlines();assert json.loads(lines[0])==dict(type='header',fingerprint=d['fingerprint'],meta=meta) and [json.loads(x) for x in lines[1:]]==d['records']
 assert p==dict(version=2,fingerprint=d['fingerprint'],executions=d['executions'],complete=d['complete'],snapshotSHA256=sha(raw),journalSHA256=sha(jb)) and d['journalSha256']==sha(jb)
 expected_sources={x.removeprefix('packages/rules/') for x in subprocess.check_output(['git','ls-tree','-r','--name-only',d['sourceRef'],'packages/rules/src'],text=True).splitlines() if x.endswith('.ts')}
 expected_sources|={'scripts/'+x for x in ['sender-development.ts','sender-development-run.ts','sender-arbitration-witness.ts','cooperative-store.ts','league-runner.ts','baselines/pre-cooperative.ts','claim-opponents.ts']}
 assert set(d['sourceHashes'])==expected_sources and set(d['verificationHashes'])=={'tools/verify-sender-development.py','tools/test-sender-development.py','tools/verify-own-share-witness.py'}
 for file,h in d['sourceHashes'].items():assert h==sha(subprocess.check_output(['git','show',d['sourceRef']+':packages/rules/'+file]))
 for file,h in d['verificationHashes'].items():assert h==sha(subprocess.check_output(['git','show',d['sourceRef']+':'+file]))
 assert d['executions']==len(d['records']) and (partial or d['complete'] and d['executions']==d['count']*144)
 cells={};byseed=collections.defaultdict(lambda:collections.defaultdict(list));pairs={};seen=set()
 for r in d['records']:
  f=r['fixture'];v=r['variant'];style=r['style'];assert v in d['variants'] and style in ['truthful','bluff','skill-aware-bluff'] and f['mode'] in RULES and d['start']<=f['seed']<d['start']+d['count'] and f['count']==8+(f['seed']-d['start'])%5 and type(f['reversed']) is bool and f['currentSide'] in [1,2]
  key=(f['mode'],style,f['seed'],f['reversed'],f['currentSide']);assert (key,v) not in seen;seen.add((key,v));pairs[key,v]=r
  counts=validate_record(r);cell=cells.setdefault(v,{}).setdefault(f['mode'],dict(games=0,score=0,wins=0,unfinished=0,resources=collections.Counter(),behavior=collections.Counter(),followups=collections.Counter(),confirmedSenderFollowups=collections.Counter(),uniqueFollowupActions=collections.Counter(),uniqueConfirmedFollowupActions=collections.Counter(),episodes=0,confirmedMemoryEpisodes=0,targetObservedEpisodes=0))
  score=.5 if r['game']['winner'] is None else int(r['game']['winnerPolicy']=='current');cell['games']+=1;cell['score']+=score;cell['wins']+=r['game']['winnerPolicy']=='current';cell['unfinished']+=r['game']['winner'] is None;cell['resources'].update(r['resources']);cell['behavior'].update(counts);cell['behavior'].update({k:r['counters'][k] for k in ['activeChoices','knownEntriesChecked','wrongKnownEntries']});cell['episodes']+=len(r['episodes']);cell['confirmedMemoryEpisodes']+=sum(e['memoryObservedAt'] is not None for e in r['episodes']);cell['targetObservedEpisodes']+=sum(bool(e['targetObserved']) for e in r['episodes']);cell['followups'].update(z['kind'] for z in r['followups']);cell['confirmedSenderFollowups'].update(z['kind'] for z in r['followups'] if z['senderKnownName'] is not None);cell['uniqueFollowupActions'].update(z[1] for z in {(t['ordinal'],t['kind'],t['target']) for t in r['followups']});cell['uniqueConfirmedFollowupActions'].update(z[1] for z in {(t['ordinal'],t['kind'],t['target']) for t in r['followups'] if t['senderKnownName'] is not None});byseed[v][f['seed']].append(score)
 contrasts={}
 for left in ['control','baseline']:
  xs=[];improved=worsened=tied=0
  for seed in range(d['start'],d['start']+d['count']):
   aa,bb=byseed[left][seed],byseed['candidate'][seed]
   if aa and len(aa)==len(bb):xs.append((sum(bb)-sum(aa))/len(aa))
  for (key,v),r in pairs.items():
   if v!='candidate' or (key,left) not in pairs:continue
   score=lambda r:.5 if r['game']['winner'] is None else int(r['game']['winnerPolicy']=='current')
   delta=score(r)-score(pairs[key,left]);improved+=delta>0;worsened+=delta<0;tied+=delta==0
  contrasts[left]=dict(seedDeltas=xs,meanDifference=sum(xs)/len(xs) if xs else None,seed95=interval(xs) if xs else None,improved=improved,worsened=worsened,tied=tied)
 path_counts=collections.Counter()
 for (key,v),r in pairs.items():
  if v!='candidate' or (key,'control') not in pairs:continue
  control=pairs[key,'control']
  path_counts['pairedGames']+=1
  path_counts['sameFullGameActionsResources']+=all(r[x]==control[x] for x in ['game','actions','resources'])
  path_counts['gamesWithChangedChoice']+=any(z['changed'] for z in r['decisions']);path_counts['gamesWithChoiceOrRngChange']+=any(z['changed'] or z['originalAfterRng']!=z['chosenAfterRng'] for z in r['decisions'])
 return dict(paths=path_counts,kind=d['kind'],sourceRef=d['sourceRef'],executions=d['executions'],complete=d['complete'],start=d['start'],count=d['count'],variants=cells,contrasts=contrasts,snapshotSHA256=sha(raw),journalSHA256=sha(jb),promotionEvidence=False,limitations=['Synthetic fixed opponents, not human or identical-policy faction balance.','Proposal availability is not a stage execution opportunity; changed selection and same-action matching reported separately.','Followups are report-consistent technical observations, not causal protection or win attribution.','Entropy rechecked from own recorded belief, not an independent retraining of the assignment model.'])
if __name__=='__main__':
 result=verify(*sys.argv[1:4],partial='--partial' in sys.argv);pathlib.Path(sys.argv[4]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['variants','limitations']},ensure_ascii=False))
