"""Independent census/receipt verifier. Does not select or retune a policy."""
import collections,gzip,hashlib,json,pathlib,sys
COMMANDERS={'rael','kane','eltas'};NAMED={'attack','advanced_attack','supreme_attack','soen_chain_murder'}
def sha(x):return hashlib.sha256(x).hexdigest()
def enc(x):return json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()
def read(path):
 b=pathlib.Path(path).read_bytes();return gzip.decompress(b) if str(path).endswith('.gz') else b
def validate_row(row,original):
 g=original['result']['game'];f=g['fixture'];roles={p['id']:p for p in original['roles']};byname={p['character']:p for p in original['roles']}
 assert row['fixture']==f and row['variant']==original['variant'] and row['winner']==g['winner'] and row['elapsedMs']==g['elapsedMs']
 assert row['originalPolicyMatched'] and row['allOriginalActionsMatched'] and row['policyReplayPasses']==row['commandReplayPasses']==1
 assert row['originalRecordSHA256']==row['policyResultSHA256']==sha(enc(original))
 assert row['receipts']==len(original['result']['actions'])
 for k in ['fullStateSHA256','engineLogSHA256']:assert len(row[k])==64 and set(row[k])<=set('abcdef0123456789')
 survivors={p['character']:p['alive'] for p in g['survivors']};final={p['id']:p for p in row['finalCommanders']}
 assert set(final)=={p['id'] for p in original['roles'] if p['character'] in COMMANDERS}
 dead={p['id'] for p in final.values() if not p['alive']};assert dead=={byname[k]['id'] for k in COMMANDERS if not survivors[k]}
 for p in final.values():
  assert p['character']==roles[p['id']]['character'] and p['alive']==survivors[p['character']]
  assert (p['diedAt'] is None)==p['alive']
 deaths=row['deaths'];assert len(deaths)==len(dead) and {d['victim'] for d in deaths}==dead
 def boundary(b):
  assert b['kind'] in ['action','advance'] and b['at']<=row['elapsedMs']
  if b['kind']=='action':
   a=original['result']['actions'][b['actionIndex']];assert a['at']==b['at'] and a['player']==b['actor'] and a['action']==b['action']
  else:assert b['actionIndex'] is None and b['actor'] is None and b['action'] is None
 def snapshot(p,own):
  assert roles[p['id']]['character']==p['character'] and roles[p['id']]['side']==p['side']
  if own:
   v=p['ownDefense'];assert v and v['player']==p['id'] and v['character']==p['character'] and v['alive']==p['alive']
   assert set(v)=={'player','at','character','mana','alive','effects','skills'}
  else:assert p['ownDefense'] is None
  guard=p['externalProtection']
  if guard:
   assert guard['scope']=='evaluator_only' and roles[guard['guardian']]['character']==guard['character']
   assert guard['character']=={'rael':'kumarin','eltas':'consume'}.get(p['character']) and guard['charges']>=0
   v=guard['guardianOwnView']
   if own:assert v and v['player']==guard['guardian'] and v['character']==guard['character'] and v['alive']==guard['alive']
   else:assert v is None
 for t in row['transitions']:
  boundary(t['boundary']);assert len(t['before'])==len(t['after'])==3
  # In advance boundaries with no due task, views may be omitted; they cannot contain a death.
  for p in t['before']:snapshot(p,p['ownDefense'] is not None)
  for p in t['after']:snapshot(p,False)
  seq=[e['seq'] for e in t['events']];assert seq==sorted(set(seq))
 counts=collections.Counter();ready=collections.Counter()
 for d in deaths:
  boundary(d['boundary']);assert d['victim'] in roles;role=roles[d['victim']];assert d['character']==role['character'] and d['side']==role['side']
  assert d['before']['id']==d['after']['id']==d['victim'] and d['before']['alive'] and not d['after']['alive']
  snapshot(d['before'],True);snapshot(d['after'],False)
  es=[e for e in d['events'] if e['kind']=='death' and e.get('data',{}).get('player')==d['victim']];assert len(es)==1
  e=es[0];assert e['seq']==d['deathSeq'] and e['data']['character']==d['character'] and e['data']['cause']==d['cause'] and e['vis']=={'to':'all'}
  assert final[d['victim']]['diedAt']==e['at'] and e['at']<=d['boundary']['at']
  if d['boundary']['kind']=='action':assert e['at']==d['boundary']['at']
  assert any(t['boundary']==d['boundary'] and t['events']==d['events'] and d['before'] in t['before'] and d['after'] in t['after'] for t in row['transitions'])
  b=d['boundary'];a=b['action'];skill=a['skill'] if a and a['type']=='skill' else b['kind']
  if b['kind']=='action':
   assert original['result']['actions'][b['actionIndex']]['accepted']
   if d['cause']=='attack-fail':assert d['victim']==b['actor']
   else:assert a.get('target')==d['victim']
  c=d['character'];counts['death:'+c]+=1;counts['cause:'+c+':'+d['cause']]+=1;counts['skill:'+c+':'+skill]+=1;counts['boundary:'+b['kind']]+=1
  counts['extraLivesRemaining:'+c]+=d['before']['extraLives']>0
  counts['incapacitated:'+c]+=any(x['kind']=='incapacitated' for x in d['before']['ownDefense']['effects'])
  guard=d['before']['externalProtection']
  if guard:
   counts['protectorAlive:'+c]+=guard['alive'];active=guard['alive'] and guard['bodyguard'] and guard['charges']>0
   counts['chargedBodyguardPresent:'+c]+=active
   if active:counts['chargedBodyguardDeathCause:'+c+':'+d['cause']]+=1
  v=d['before']['ownDefense']
  for s in v['skills']:
   if not s['passive'] and s['blocked'] is None and s['cooldownRemainingMs']==0 and s['usesLeft']!=0 and v['mana']>=s['mana']:ready[c+':'+s['key']]+=1
 named=set()
 for a in original['result']['actions']:
  act=a['action'];t=roles.get(act.get('target'))
  if act['type']=='skill' and act['skill'] in NAMED and t and t['character'] in COMMANDERS and a['accepted'] and 'attack.kill' in a['receiptKinds']:named.add(t['character'])
 for d in deaths:
  if d['character'] not in named:counts['outsideNamedTrace:'+d['character']]+=1
 return counts,ready
def verify(path,raw_path,journal=None,publication=None):
 raw=read(raw_path);assert sha(raw)=='3660f8ce495e8789e011171ca23ceec9a1f97825e90a1020ba3d1d415ca0e822';original=json.loads(raw)
 blob=read(path);d=json.loads(blob);n=d['executions'];assert d['kind']=='commander-engine-death-replay' and d['newResearchExecutions']==0 and d['inputSHA256']==sha(raw)
 assert d['settings']==original['settings'] and d['optionsSHA256']==original['optionsSHA256'] and d['expectedUniqueGames']==320 and d['passesPerUniqueGame']==2
 assert 0<=n<=320 and len(d['records'])==n and d['complete']==(n==320)
 meta={k:v for k,v in d.items() if k not in ['fingerprint','executions','complete','records','journalSha256']};assert sha(enc(meta))==d['fingerprint']
 if journal:
  j=read(journal);lines=j.splitlines();header=json.loads(lines[0]);records=[json.loads(x) for x in lines[1:]];pub=json.loads(read(publication))
  assert header=={'type':'header','fingerprint':d['fingerprint'],'meta':meta} and records==d['records']
  assert sha(j)==d['journalSha256']==pub['journalSHA256'] and sha(blob)==pub['snapshotSHA256'] and pub['executions']==n and pub['complete']==d['complete'] and pub['fingerprint']==d['fingerprint']
 for p,h in d['sourceHashes'].items():assert sha(pathlib.Path('packages/rules',p).read_bytes())==h
 for p,h in d['verificationHashes'].items():assert sha(pathlib.Path(p).read_bytes())==h
 buckets={};seen=set()
 for i,row in enumerate(d['records']):
  o=original['records'][i];f=row['fixture'];key=(row['variant'],f['seed'],f['reversed']);assert key not in seen;seen.add(key)
  c,r=validate_row(row,o)
  for count in [0,f['count']]:
   b=buckets.setdefault((row['variant'],count),{'counts':collections.Counter(),'ownReadySkillRowsAtDeath':collections.Counter()});b['counts'].update(c);b['ownReadySkillRowsAtDeath'].update(r);b['counts']['games']+=1;b['counts']['winner:'+str(row['winner'])]+=1;b['counts']['matchedActions']+=row['receipts']
 if d['complete']:
  expected={'cooperative':86,'reportedSupreme':84}
  for v,count in expected.items():assert buckets[(v,0)]['counts']['outsideNamedTrace:eltas']==count
 return {'kind':d['kind'],'complete':d['complete'],'uniqueReplayedGames':n,'policyReplayPasses':n,'commandReplayPasses':n,'newResearchExecutions':0,'newUnfinished':0,'sourceRef':d['sourceRef'],'snapshotSHA256':sha(blob),'inputSHA256':sha(raw),'optionsSHA256':d['optionsSHA256'],'summary':[{'variant':k[0],'count':k[1],**b} for k,b in sorted(buckets.items())], 'limitations':['Post-hoc deterministic synthetic-bot diagnosis; no policy or skill intervention.','Ready skill rows at a death are not legal target-specific rescue opportunities or avoided-death estimates.','Actual protector state is evaluator-only, not the commander knowledge.','No human matches; no independent win-rate improvement claimed.']}
if __name__=='__main__':
 if len(sys.argv)!=6:raise SystemExit('snapshot raw045 journal publication output-summary')
 s=verify(*sys.argv[1:5]);pathlib.Path(sys.argv[5]).write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in s.items() if k!='summary'},ensure_ascii=False))
