"""Own-information opportunity accounting, independently joined to every original action."""
import argparse,collections,gzip,hashlib,json,pathlib,statistics,subprocess
def raw(p):
 b=p.read_bytes();return gzip.decompress(b) if p.suffix=='.gz' else b
def sha(b):return hashlib.sha256(b).hexdigest()
def enc(x):return json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()
p=argparse.ArgumentParser();p.add_argument('source',type=pathlib.Path);p.add_argument('replay',type=pathlib.Path);p.add_argument('--audit-source-ref');a=p.parse_args()
original=raw(a.source);audit=raw(a.replay);s=json.loads(original);d=json.loads(audit)
assert d['kind']=='commander-opportunities-replay' and d['researchExecutions']==0 and d['sourceSHA256']==sha(original)
assert s['complete'] and s['executions']==320==len(s['records'])==d['replayedGames']==len(d['records'])
assert d['policySourceHashes']==s['sourceHashes'] and d['options']==s['options'] and d['optionsSHA256']==s['optionsSHA256']
assert set(d['auditSourceHashes'])=={'commander-opportunities.ts','commander-opportunities-run.ts','guard-realization.ts'}
for path,h in d['auditSourceHashes'].items():
 b=subprocess.check_output(['git','show',a.audit_source_ref+':packages/rules/scripts/'+path]) if a.audit_source_ref else pathlib.Path('packages/rules/scripts',path).read_bytes()
 assert sha(b)==h
key=lambda v,f:(v,f['seed'],f['reversed'])
source={key(x['variant'],x['result']['game']['fixture']):x for x in s['records']};assert len(source)==320
named={'attack','advanced_attack','supreme_attack','soen_chain_murder'}
special={'rael_master_power','kilder_master_power','consume_slaughter','kane_wolfs_slash'}
roles={'rael':1,'kane':1,'eltas':2};seen=set();buckets={};side_buckets={};examples=[];per_game=[]
def bucket(table,k):return table.setdefault(k,dict(counts=collections.Counter(),games=set(),seeds=set(),readyGames=set(),knownLivingGames=set(),firstKnown=[],firstReady=[]))
def classification(q,t):
 act=q['action'];target=(act or {}).get('target')
 if q['selectedKind'] in ['named_attack','special_attack']:
  if target==t['id']:return q['selectedKind']+'_same_commander'
  if q['selectedKnownRole'] in roles:return q['selectedKind']+'_other_known_commander'
  return q['selectedKind']+'_other_target'
 return q['selectedKind']
for r in d['records']:
 k=key(r['variant'],r['fixture']);assert k not in seen;seen.add(k);o=source[k];f=r['fixture'];variant=r['variant']
 assert r['gameMatched'] and r['actionsMatched'] and r['game']==o['result']['game'] and r['actions']==len(o['result']['actions'])
 keys=['player','at','action','accepted','error','beforeMana','afterMana','nominalMana','character','side','receiptKinds']
 actions=[{k:z[k] for k in keys} for z in o['result']['actions']]
 assert r['actionSHA256']==r['originalActionSHA256']==sha(enc(actions))
 by_id={z['id']:z for z in o['roles']};action_map={(z['player'],z['at']):z for z in actions if z['action']['type']=='skill'}
 assert len(action_map)==sum(z['action']['type']=='skill' for z in actions)
 decision_keys=set();selected=set();first_known={};first_ready={};local=collections.Counter();last_at=0
 for q in r['decisions']:
  at=q['at'];actor=q['player'];dk=(actor,at);assert dk not in decision_keys;decision_keys.add(dk)
  assert last_at<=at<=r['game']['elapsedMs'];last_at=at
  assert by_id[actor]['character']==q['character'] and by_id[actor]['side']==q['side'] and 0<=q['mana']<=150
  act=q['action'];kind='none' if not act or act['type']!='skill' else 'named_attack' if act['skill'] in named else 'special_attack' if act['skill'] in special else act['skill'] if act['skill'] in ['publish','break_ally'] else 'other'
  assert q['selectedKind']==kind
  actual=by_id.get((act or {}).get('target'));assert q['grading']['selectedActualRole']==(actual['character'] if actual else None) and q['grading']['selectedActualSide']==(actual['side'] if actual else None)
  if q['selectedKnownRole']:assert actual and q['selectedKnownRole']==actual['character']
  if act:
   aa=action_map[dk];assert aa['action']==act and aa['beforeMana']==q['mana'];selected.add(dk)
  else:assert dk not in action_map
  assert [t['role'] for t in q['targets']]==(['eltas'] if q['side']==1 else ['rael','kane'])
  wrong=0;ready=[]
  for t in q['targets']:
   role=t['role'];tid=t['id'];skills=[x for x in q['skills'] if x['key'] in named];names=[x for x in skills if role in (x['nameOptions'] or [])]
   available=[x['key'] for x in names if x['blocked'] is None and t['alive'] and (x['ignoresInvulnerable'] or not t['invulnerable'])]
   status='unknown' if tid is None else 'known_dead' if not t['alive'] else 'known_invulnerable' if t['invulnerable'] and not any(x['ignoresInvulnerable'] for x in names) else 'no_named_skill' if not skills else 'name_unavailable' if not names else 'named_blocked' if not available else 'ready'
   assert t['status']==status and t['available']==available
   if tid:
    assert tid!=actor and tid in by_id;wrong+=int(by_id[tid]['character']!=role)
    assert t['provenance'] in ['public_reveal','received_fact','constraint_inference'] and t['candidateIds']==[tid]
   else:assert t['provenance']=='unknown' and t['alive'] is None and t['invulnerable'] is None
   assert len(set(t['candidateIds']))==len(t['candidateIds']) and all(i in by_id and i!=actor for i in t['candidateIds'])
   assert all(i in by_id for i in t['claimIds'])
   assert all(z['target'] in by_id and z['sender'] in by_id and z['at']<=at and z['seq']>0 for z in t['reports'])
   for target in t['trustedReportIds']:
    assert tid is None and any(z['target']==target and z['senderKnown'] and by_id[z['sender']]['character']==z['senderKnown'] and by_id[z['sender']]['side']==q['side'] and z['senderAlive'] and z['targetAlive'] and z['compatible'] for z in t['reports'])
   if tid and t['alive']:first_known.setdefault(role,at)
   if status=='ready':ready.append(t);first_ready.setdefault(role,at)
   for count in [0,f['count']]:
    b=bucket(buckets,(variant,count,q['side'],role));b['games'].add(k);b['seeds'].add(f['seed']);c=b['counts'];c['activeRoleDecisions']+=1;c['status:'+status]+=1;c['knowledge:'+t['provenance']]+=1
    if tid and t['alive']:c['knownLiving']+=1;b['knownLivingGames'].add(k)
    if status=='unknown':
     c['unknownWithTrustedReport']+=bool(t['trustedReportIds']);c['unknownWithAnyReport']+=bool(t['reports']);c['unknownWithClaim']+=bool(t['claimIds'])
    if status=='named_blocked':
     for reason in set(x['blocked'] for x in names):c['block:'+str(reason).split(' (')[0]]+=1
    if status=='ready':
     b['readyGames'].add(k);outcome=classification(q,t);c['readyChoice:'+outcome]+=1
     if act and act.get('target')==tid and kind in ['named_attack','special_attack']:
      aa=action_map[dk];c['selectedSameAccepted']+=aa['accepted'];c['selectedSameRejected']+=not aa['accepted'];c['selectedSameAttackFailure']+=any(x in ['attack.fail','attack.fail.death','attack.fail.self'] for x in aa['receiptKinds'])
    if kind=='named_attack' and actual and actual['character']==role:
     c['allNamedAttemptsOnCommander']+=1;c['namedWithKnownIdentity']+=tid==actual['id'];c['namedCorrectName']+=act.get('name')==role
   if status=='ready' and classification(q,t) not in ['named_attack_same_commander','special_attack_same_commander','named_attack_other_known_commander','special_attack_other_known_commander'] and len(examples)<60:
    examples.append(dict(variant=variant,fixture=f,decision=q,commander=role,classification=classification(q,t)))
  assert q['grading']['knownWrong']==wrong==0
  for count in [0,f['count']]:
   b=bucket(side_buckets,(variant,count,q['side']));b['games'].add(k);b['seeds'].add(f['seed']);c=b['counts'];c['activeDecisions']+=1
   if ready:
    b['readyGames'].add(k);c['anyReady']+=1
    c['attackReadyCommander']+=kind in ['named_attack','special_attack'] and any((act or {}).get('target')==t['id'] for t in ready)
    c['readyChoice:'+kind]+=1
  local['active']+=1;local['anyReady']+=bool(ready);local['nullChoices']+=act is None
 assert selected==set(action_map)
 for (v,count,side,role),b in buckets.items():
  if v!=variant or count not in [0,f['count']]:continue
  if role in first_known:b['firstKnown'].append(first_known[role])
  if role in first_ready:b['firstReady'].append(first_ready[role])
 per_game.append(dict(variant=variant,fixture=f,winner=r['game']['winner'],counts=local,firstKnown=first_known,firstReady=first_ready))
assert seen==set(source)
def timing(xs):return dict(n=len(xs),min=min(xs),median=statistics.median(xs),max=max(xs)) if xs else dict(n=0)
def output(table):
 rows=[]
 for k,b in sorted(table.items()):
  rows.append(dict(variant=k[0],count=k[1],side=k[2],**({'role':k[3]} if len(k)==4 else {}),games=len(b['games']),independentSeeds=len(b['seeds']),readyGames=len(b['readyGames']),knownLivingGames=len(b['knownLivingGames']),firstKnownMs=timing(b['firstKnown']),firstReadyMs=timing(b['firstReady']),counts=b['counts']))
 return rows
print(json.dumps(dict(kind='commander-opportunities-summary',sourceSHA256=sha(original),replaySHA256=sha(audit),analysisSHA256=sha(pathlib.Path(__file__).read_bytes()),auditSourceRef=a.audit_source_ref,researchExecutions=0,replayedGames=320,allGamesAndActionReceiptsMatched=True,roleRows=output(buckets),sideRows=output(side_buckets),examples=examples,perGame=per_game,
 limitations=['Existing synthetic development games; replay is not an independent sample or new performance evaluation.','One faction faces one commander; the other faces two. Role decisions cannot be pooled as unique actor opportunities.','Readiness covers named attacks, not all attacks; specials are classified separately. Public invulnerability blocks targeting; charged primordial guards do not.','Knowledge derives from own facts, public reveal or constraint inference; trusted reports and claims remain uncertain.','Repeated active choices are correlated; game and seed counts are supplied.','Target selection and skill effects are descriptive, not isolated causes of faction win imbalance.']),ensure_ascii=False,indent=2))
