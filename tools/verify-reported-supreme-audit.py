"""Independent own-condition accounting; hypothetical receipts are never actual game results."""
import argparse,collections,gzip,hashlib,json,pathlib,subprocess
def raw(p):
 b=p.read_bytes();return gzip.decompress(b) if p.suffix=='.gz' else b
def sha(b):return hashlib.sha256(b).hexdigest()
def enc(x):return json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()
p=argparse.ArgumentParser();p.add_argument('source',type=pathlib.Path);p.add_argument('replay',type=pathlib.Path);p.add_argument('activity_reference',type=pathlib.Path);p.add_argument('--audit-source-ref');a=p.parse_args()
sr=raw(a.source);ar=raw(a.replay);s=json.loads(sr);d=json.loads(ar)
assert d['kind']=='reported-supreme-same-point-replay' and d['researchExecutions']==0 and d['sourceSHA256']==sha(sr)
assert s['complete'] and s['executions']==320==len(s['records'])==d['replayedGames']==len(d['records'])
assert d['policySourceHashes']==s['sourceHashes'] and d['options']==s['options'] and d['optionsSHA256']==s['optionsSHA256']
assert d['comparisonOptions']=={'reportedSupreme':True} and d['comparisonOptionsSHA256']==sha(enc(d['comparisonOptions']))
assert set(d['auditSourceHashes'])=={'reported-supreme-audit.ts','reported-supreme-audit-run.ts','guard-realization.ts'}
for path,h in d['auditSourceHashes'].items():
 b=subprocess.check_output(['git','show',a.audit_source_ref+':packages/rules/scripts/'+path]) if a.audit_source_ref else pathlib.Path('packages/rules/scripts',path).read_bytes()
 assert sha(b)==h
key=lambda v,f:(v,f['seed'],f['reversed'])
source={key(x['variant'],x['result']['game']['fixture']):x for x in s['records']};assert len(source)==320
rr=raw(a.activity_reference);reference=json.loads(rr)
assert reference['kind']=='commander-opportunities-replay' and reference['sourceSHA256']==sha(sr) and reference['replayedGames']==320
activity={key(x['variant'],x['fixture']):x for x in reference['records']};assert set(activity)==set(source)
seen=set();buckets={};changed_rows=[];eligible_rows=[]
for r in d['records']:
 k=key(r['variant'],r['fixture']);assert k not in seen;seen.add(k);o=source[k];f=r['fixture'];variant=r['variant']
 assert r['gameMatched'] and r['actionsMatched'] and r['game']==o['result']['game'] and r['actions']==len(o['result']['actions'])
 keys=['player','at','action','accepted','error','beforeMana','afterMana','nominalMana','character','side','receiptKinds']
 actions=[{k:z[k] for k in keys} for z in o['result']['actions']]
 assert r['actionSHA256']==r['originalActionSHA256']==sha(enc(actions))
 prior=activity[k];assert prior['game']==r['game'] and prior['actionSHA256']==r['actionSHA256']
 assert [(q['player'],q['at'],q['off']) for q in r['decisions']]==[(q['player'],q['at'],q['action']) for q in prior['decisions']]
 by_id={z['id']:z for z in o['roles']};seat={p['id']:i for i,p in enumerate(o['roles'])}
 actual={(z['player'],z['at']):z for z in actions if z['action']['type']=='skill'};selected=set();unique=set();last_at=0
 for q in r['decisions']:
  dk=(q['player'],q['at']);assert dk not in unique;unique.add(dk)
  assert last_at<=q['at']<=r['game']['elapsedMs'];last_at=q['at'];assert q['side']==by_id[q['player']]['side'] and q['character']==by_id[q['player']]['character']
  assert q['knowledgeUnchanged'] and q['changed']==(q['off']!=q['on']) and 0<=q['mana']<=150
  if q['off']:assert actual[dk]['action']==q['off'] and actual[dk]['beforeMana']==q['mana'];selected.add(dk)
  else:assert dk not in actual
  skill=q['skill'];eligible=[];reasons=collections.Counter()
  assert len({t['id'] for t in q['targets']})==len(q['targets'])
  for t in q['targets']:
   assert t['alive'] and not t['known'] and t['id']!=q['player'] and t['id'] in by_id and t['senders']
   role=next(p for p in o['roles'] if p['character']==t['name']);assert t['side']==role['side'] and t['commander']==(t['name'] in ['rael','kane','eltas'])
   for sender in t['senders']:
    assert sender['id'] in by_id and by_id[sender['id']]['character']==sender['knownRole'] and by_id[sender['id']]['side']==q['side'] and sender['at']<=q['at'] and sender['seq']>0
   reason='no_skill' if not skill else 'skill_blocked' if skill['blocked'] is not None else 'before_four_minutes' if q['at']<240000 else 'reserve_mana' if q['mana']<max(100,skill['mana']) else 'friendly_report' if t['side']==q['side'] else 'name_unavailable' if not t['nameAllowed'] else 'public_invulnerable' if not skill['ignoresInvulnerable'] and t['invulnerable'] else 'own_same_name_failure' if t['ownSameNameFailure'] else 'eligible'
   assert reason==t['reason'];reasons[reason]+=1
   if reason=='eligible':eligible.append(t)
  eligible.sort(key=lambda t:(-int(t['commander']),seat[t['id']]))
  expected={'type':'skill','skill':'supreme_attack','target':eligible[0]['id'],'name':eligible[0]['name']} if eligible else None
  assert q['suggestion']==expected
  if q['changed']:
   assert expected and q['on']==expected and q['hypothetical'] is not None
   h=q['hypothetical'];target=by_id[q['on']['target']];assert h['targetActualRole']==target['character'] and h['wrongName']==(target['character']!=q['on']['name'])
   assert h['attackFailure']==any(e in ['attack.fail.self','attack.fail','attack.fail.death'] for e in h['receiptKinds'])
   assert h['accepted']==(h['error'] is None) and -skill['mana']<=h['manaDelta']<=150-q['mana']
   if h['accepted']:assert any(e in ['attack.hit','attack.kill','attack.guarded','attack.fail','attack.fail.death'] for e in h['receiptKinds'])
   changed_rows.append(dict(variant=variant,fixture=f,decision=q))
  else:assert q['hypothetical'] is None
  if eligible:eligible_rows.append(dict(variant=variant,fixture=f,player=q['player'],at=q['at'],target=eligible[0]['name'],changed=q['changed'],off=q['off'],on=q['on']))
  for count in [0,f['count']]:
   b=buckets.setdefault((variant,count),dict(counts=collections.Counter(),games=set(),seeds=set(),eligibleGames=set(),changedGames=set(),changedSeeds=set(),roleCounts=collections.Counter()))
   b['games'].add(k);b['seeds'].add(f['seed']);c=b['counts'];c['activeDecisions']+=1;c['withSupreme']+=skill is not None;c['withTrustedReports']+=bool(q['targets']);c['trustedTargets']+=len(q['targets']);c.update({'targetReason:'+x:n for x,n in reasons.items()})
   if eligible:
    b['eligibleGames'].add(k);c['eligibleDecisions']+=1;c['alreadyChosenWithoutOption']+=q['off']==expected;c['higherPriorityPreserved']+=q['on']!=expected
   if q['changed']:
    b['changedGames'].add(k);b['changedSeeds'].add(f['seed']);c['changedDecisions']+=1;c['original:'+((q['off'] or {}).get('skill','null'))]+=1
    c['changedCommander']+=eligible[0]['commander'];b['roleCounts'][eligible[0]['name']]+=1;h=q['hypothetical'];c['hypotheticalAccepted']+=h['accepted'];c['hypotheticalRejected']+=not h['accepted'];c['hypotheticalWrongName']+=h['wrongName'];c['hypotheticalFailure']+=h['attackFailure'];c['hypotheticalNominalMana']+=skill['mana'];c['hypotheticalManaDelta']+=h['manaDelta']
 assert selected==set(actual)
assert seen==set(source)
rows=[dict(variant=k[0],count=k[1],counts=b['counts'],games=len(b['games']),independentSeeds=len(b['seeds']),eligibleGames=len(b['eligibleGames']),changedGames=len(b['changedGames']),changedIndependentSeeds=len(b['changedSeeds']),changedRoles=b['roleCounts']) for k,b in sorted(buckets.items())]
print(json.dumps(dict(kind='reported-supreme-same-point-summary',sourceSHA256=sha(sr),replaySHA256=sha(ar),activityReferenceSHA256=sha(rr),analysisSHA256=sha(pathlib.Path(__file__).read_bytes()),auditSourceRef=a.audit_source_ref,researchExecutions=0,replayedGames=320,allGamesAndActionReceiptsMatched=True,allActiveDecisionsMatched=True,rows=rows,changedRows=changed_rows,eligibleRows=eligible_rows,
 limitations=['All actual matches use original OFF policy; ON actions are isolated counterfactuals.','A repeated eligible point on an unchanged OFF trajectory is not another attack that could all occur in one ON game.','Hypothetical cost/receipts do not measure full-match mana, survival, exposure or win effect.','Existing synthetic development corpus; no new independent sample, human match, skill change or deployment.']),ensure_ascii=False,indent=2))
