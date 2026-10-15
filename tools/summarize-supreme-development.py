"""Descriptive full-match behavior/paired outcomes, never a tuning or promotion rule."""
import argparse,collections,gzip,hashlib,json,pathlib
p=argparse.ArgumentParser();p.add_argument('raw',type=pathlib.Path);p.add_argument('verified',type=pathlib.Path);a=p.parse_args()
read=lambda p:gzip.decompress(p.read_bytes()) if p.suffix=='.gz' else p.read_bytes()
raw=read(a.raw);d=json.loads(raw);v=json.loads(read(a.verified));assert d['complete'] and d['executions']==v['executions']==d['count']*144 and d['kind']=='trusted-supreme-report-comparison'
assert v['fingerprint']==d['fingerprint'] and v['sourceHashes']==d['sourceHashes'] and v['complete'] and v['journalVerified'] and v['publicationVerified']
key=lambda r:(r['mode'],r['style'],r['result']['game']['fixture']['seed'],r['result']['game']['fixture']['reversed'],r['result']['game']['fixture']['currentSide'])
control={key(r):r['result'] for r in d['records'] if r['variant']=='control'};candidate={key(r):r['result'] for r in d['records'] if r['variant']=='reportedSupreme'};assert len(control)==len(candidate)==d['count']*48 and set(control)==set(candidate)
project=lambda r:[{k:x[k] for k in ['player','at','action','accepted','error','beforeMana','afterMana','nominalMana','character','side']} for x in r['actions']]
score=lambda g:.5 if g['winnerPolicy'] is None else int(g['winnerPolicy']=='current')
counts=collections.Counter();rows=[];strata={};report_games=set();report_seeds=set();change_games=set();change_seeds=set()
for k,r in candidate.items():
 old=control[k];left,right=project(old),project(r);difference=score(r['game'])-score(old['game']);counts['improved' if difference>0 else 'worsened' if difference<0 else 'tied']+=1
 changed=left!=right;counts['actualActionChangedPairs']+=changed
 if changed:
  i=next((i for i,(x,y) in enumerate(zip(left,right)) if x!=y),min(len(left),len(right)));first=right[i] if i<len(right) else None
  proof=next((q for q in r['supremeDecisions'] if q['changed'] and first and q['player']==first['player'] and q['at']==first['at'] and q['chosenAction']==first['action']),None)
  assert proof is not None;counts['firstDivergenceIsActualReport']+=1
 else:
  assert old['game']==r['game'] and old['resources']==r['resources'];counts['unchangedPairsGameResourcesExact']+=1
 for q in r['supremeDecisions']:
  f=r['game']['fixture'];bucket=(k[0],f['count'],f['currentSide']);b=strata.setdefault(bucket,collections.Counter())
  eligible=bool(q['suggestion']);b['active']+=1;b['eligible']+=eligible;b['selected']+=q['selected'];b['changed']+=q['changed'];b['higherPriority']+=eligible and not q['selected'];b['idleReplaced']+=q['changed'] and q['originalAction'] is None
  if q['changed']:change_games.add(k);change_seeds.add(f['seed'])
  if not q['selected']:continue
  report_games.add(k);report_seeds.add(f['seed']);h=q['receipt'];act=q['chosenAction'];actual=next(x for x in r['actions'] if x['player']==q['player'] and x['at']==q['at'] and x['action']==act)
  b['accepted']+=h['accepted'];b['failed']+=any(x in ['attack.fail.self','attack.fail','attack.fail.death'] for x in h['receiptKinds'])
  b['wrong']+=h['actualName']!=act['name'] or h['actualSide']==q['side'];b['nominalMana']+=actual['nominalMana'];b['netManaDelta']+=h['manaDelta']
  counts['receiptKill']+='attack.kill' in h['receiptKinds'];counts['receiptHit']+='attack.hit' in h['receiptKinds'];counts['receiptGuarded']+='attack.guarded' in h['receiptKinds']
  later=[x for x in r['actions'] if x['player']==q['player'] and x['at']>q['at'] and x['action'].get('target')==act['target']]
  rows.append({'fixture':f,'style':k[1],'player':q['player'],'at':q['at'],'role':q['character'],'target':act['target'],'name':act['name'],'changed':q['changed'],'original':q['originalAction'],'receipt':h,'laterSameTargetActions':len(later),'laterSameTargetSkillCounts':dict(collections.Counter(x['action'].get('skill',x['action']['type']) for x in later))})
out={'kind':'supreme-report-development-behavior-summary','sourceSHA256':hashlib.sha256(raw).hexdigest(),'analysisSHA256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),'executions':d['executions'],'pairedGames':len(candidate),'pairs':dict(counts),'reportGames':len(report_games),'reportIndependentSeeds':len(report_seeds),'optionChangedGames':len(change_games),'optionChangedIndependentSeeds':len(change_seeds),'strata':[dict(mode=k[0],count=k[1],side=k[2],counts=b) for k,b in sorted(strata.items())],'actualReportAttacks':rows,'limitations':['Synthetic fixed opponents; no human data or equal-policy balance inference.','Same-point OFF choices on ON paths are not control match opportunities.','Later same-target actions are descriptive, not independent causal effects.','Historical win gate is diagnostic only; no deployment or threshold tuning.']}
print(json.dumps(out,ensure_ascii=False,indent=2))
