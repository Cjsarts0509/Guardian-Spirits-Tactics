"""Exact replay and bodyguard conservation checks; descriptive, not causal attribution."""
import argparse,collections,gzip,hashlib,json,pathlib,subprocess
def raw(p):
 b=p.read_bytes();return gzip.decompress(b) if p.suffix=='.gz' else b
def sha(b):return hashlib.sha256(b).hexdigest()
def enc(x):return json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()
p=argparse.ArgumentParser();p.add_argument('source',type=pathlib.Path);p.add_argument('replay',type=pathlib.Path);p.add_argument('--audit-source-ref');a=p.parse_args()
original=raw(a.source);audit=raw(a.replay);s=json.loads(original);d=json.loads(audit)
assert d['kind']=='guard-realization-replay' and d['researchExecutions']==0 and d['sourceSHA256']==sha(original)
assert s['complete'] and s['executions']==320==len(s['records'])==d['replayedGames']==len(d['records'])
assert d['policySourceHashes']==s['sourceHashes'] and d['options']==s['options'] and d['optionsSHA256']==s['optionsSHA256']
assert set(d['auditSourceHashes'])=={'guard-realization.ts','guard-realization-run.ts'}
for path,h in d['auditSourceHashes'].items():
 b=subprocess.check_output(['git','show',a.audit_source_ref+':packages/rules/scripts/'+path]) if a.audit_source_ref else pathlib.Path('packages/rules/scripts',path).read_bytes()
 assert sha(b)==h
key=lambda v,f:(v,f['seed'],f['reversed'])
source={key(x['variant'],x['result']['game']['fixture']):x for x in s['records']}
assert len(source)==320
seen=set();stats={v:{} for v in s['variants']};per_guard={};role_rows=[]
for r in d['records']:
 k=key(r['variant'],r['fixture']);assert k not in seen;seen.add(k);o=source[k]
 assert r['gameMatched'] and r['actionsMatched'] and r['game']==o['result']['game'] and r['actions']==len(o['result']['actions'])
 keys=['player','at','action','accepted','error','beforeMana','afterMana','nominalMana','character','side','receiptKinds']
 actions=[{k:z[k] for k in keys} for z in o['result']['actions']]
 assert r['actionSHA256']==r['originalActionSHA256']==sha(enc(actions))
 by_id={z['id']:z for z in o['roles']};role_data={}
 assert {q['id'] for q in r['finalGuardians']}=={z['id'] for z in o['roles'] if z['character'] in ['consume','kumarin']}
 for q in r['finalGuardians']:
  assert q['role'] in ['consume','kumarin'] and by_id[q['id']]['character']==q['role']
  assert q['targetCharacter']==('eltas' if q['role']=='consume' else 'rael') and by_id[q['target']]['character']==q['targetCharacter']
  role_data[q['id']]=dict(role=q['role'],casts=[],absorbed=[],deathAt=None,end=q)
 prior=None;last_at=0
 for t in r['transitions']:
  assert last_at<=t['at']<=r['game']['elapsedMs'];last_at=t['at']
  if prior is not None:assert prior==t['before']
  else:assert all(q['charges']==0 and q['alive'] and not q['hasSkill'] for q in t['before'])
  assert [q['id'] for q in t['before']]==[q['id'] for q in t['after']]==list(role_data)
  if t['cause']=='action':
   aa=[z for z in actions if z['player']==t['actor'] and z['at']==t['at'] and z['action']==t['action']]
   assert len(aa)==1 and aa[0]['receiptKinds']==[e['kind'] for e in t['events']]
  else:assert t['cause']=='advance' and t['action'] is None and t['actor'] is None
  for before,after in zip(t['before'],t['after']):
   q=role_data[after['id']];delta=after['charges']-before['charges'];assert 0<=after['charges']<=2
   if delta>0:
    assert delta==2 and before['charges']==0 and after['hasSkill'] and t['actor']==after['id']
    assert any(e['kind']=='skill.'+after['skill'] for e in t['events'])
    q['casts'].append(t['at'])
   elif delta<0:
    assert delta==-1 and before['alive'] and before['hasSkill']
    events=[e for e in t['events'] if e['kind']=='attack.guarded' and '보디가드' in e['text'] and e.get('data',{}).get('target')==after['targetCharacter']]
    assert len(events)==1;q['absorbed'].append(dict(at=t['at'],attacker=events[0]['data']['attacker'],target=after['targetCharacter'],event=events[0]))
   if before['alive'] and not after['alive']:assert q['deathAt'] is None;q['deathAt']=t['at']
  prior=t['after']
 if prior is not None:assert prior==r['finalGuardians']
 for id,q in role_data.items():
  assert len(q['casts'])<=1 and len(q['absorbed'])+q['end']['charges']==2*len(q['casts'])
  b=stats[r['variant']].setdefault(q['role'],collections.Counter())
  b.update(dict(appearances=1,casts=len(q['casts']),providedCharges=2*len(q['casts']),absorbed=len(q['absorbed']),unusedChargesAtEnd=q['end']['charges'],castGamesWithAbsorption=int(bool(q['absorbed'])),castGamesNoAbsorption=int(bool(q['casts']) and not q['absorbed'])))
  if q['casts']:
   end=q['end'];reason='guardian_dead' if not end['alive'] else 'guard_skill_absent' if not end['hasSkill'] else 'target_dead' if not end['targetAlive'] else 'still_ready_at_game_end'
   b['unused:'+reason]+=end['charges']
  per_guard[r['variant'],r['fixture']['seed'],r['fixture']['reversed'],id]=q
  role_rows.append(dict(variant=r['variant'],fixture=r['fixture'],player=id,**q))
assert seen==set(source)
paired=[]
for k,o in source.items():
 if o['variant']!='knownCommanderGuardBeforeAlly':continue
 for decision in o['result']['guardDecisions']:
  if not decision['eligible']:continue
  id=decision['player'];control=per_guard['cooperative',k[1],k[2],id];candidate=per_guard['knownCommanderGuardBeforeAlly',k[1],k[2],id]
  assert candidate['casts']==[decision['at']]
  paired.append(dict(seed=k[1],reversed=k[2],player=id,role=decision['character'],candidateCast=decision['at'],controlCast=control['casts'][0] if control['casts'] else None,
   earlierMs=control['casts'][0]-decision['at'] if control['casts'] else None,candidateAbsorbed=len(candidate['absorbed']),controlAbsorbed=len(control['absorbed']),deltaAbsorbed=len(candidate['absorbed'])-len(control['absorbed']),candidateDeathAt=candidate['deathAt'],controlDeathAt=control['deathAt'],candidateEnd=candidate['end'],controlEnd=control['end']))
assert len(paired)==40
out=dict(kind='guard-realization-summary',sourceSHA256=sha(original),replaySHA256=sha(audit),analysisSHA256=sha(pathlib.Path(__file__).read_bytes()),auditSourceRef=a.audit_source_ref,researchExecutions=0,replayedGames=320,allGamesAndActionReceiptsMatched=True,variants=stats,earlyGuardPairs=paired,roleRows=role_rows,
 earlyGuardSummary=dict(opportunities=len(paired),candidateOnlyCasts=sum(x['controlCast'] is None for x in paired),earlier=[min(x['earlierMs'] for x in paired if x['earlierMs'] is not None),max(x['earlierMs'] for x in paired if x['earlierMs'] is not None)],absorbedDeltas=dict(collections.Counter(str(x['deltaAbsorbed']) for x in paired)),candidateAbsorbed=sum(x['candidateAbsorbed'] for x in paired),controlAbsorbed=sum(x['controlAbsorbed'] for x in paired)),
 limitations=['Replay of existing synthetic games; no additional independent evidence.','Different trajectories after guard intervention; absorption counts are descriptive and not isolated causal win contribution.','Unused charges are not automatically bad decisions; future damage is not known to policy.','Zero absorbed hits does not rule out deterrence or attacker target switching.'])
print(json.dumps(out,ensure_ascii=False,indent=2))
