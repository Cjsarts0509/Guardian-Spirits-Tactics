"""Verify bounded replay/own receipts against the frozen completed development records."""
import argparse,collections,gzip,hashlib,json,pathlib
p=argparse.ArgumentParser();p.add_argument('raw',type=pathlib.Path);p.add_argument('replay',type=pathlib.Path);a=p.parse_args()
def read(path):
 b=path.read_bytes();return gzip.decompress(b) if path.suffix=='.gz' else b
def sha(b):return hashlib.sha256(b).hexdigest()
def js_hash(obj):return sha(json.dumps(obj,ensure_ascii=False,separators=(',',':')).encode())
d=json.loads(read(a.raw));r=json.loads(read(a.replay));assert d['start']==142000 and d['count']==32 and d['complete'] and d['executions']==3072
assert r['kind']=='own-attack-failure-receipt-replay' and r['complete'] and r['sourceInputSHA256']==sha(a.raw.read_bytes()) and r['replayGames']==r['maximumReplayGames']==len(r['rows'])==23 and r['researchExecutions']==0
def key(f,style,variant):return (f['mode'],f['seed'],f['count'],f['reversed'],f['currentSide'],style,variant)
expected={key(x['result']['game']['fixture'],x['style'],x['variant']):x['result'] for x in d['records'] if any(t['attackFailure'] for t in x['result']['actions'])}
seen=set();modes={};repeat_cases=set();total=collections.Counter();repeat_rows=[]
for row in r['rows']:
 k=key(row['fixture'],row['style'],row['variant']);assert k in expected and k not in seen;seen.add(k);original=expected[k]
 assert row['originalResultSHA256']==row['replayedResultSHA256']==js_hash(original)
 failed=[t for t in original['actions'] if t['attackFailure']];assert len(failed)==len(row['failures'])==len(row['traces'])
 stats=modes.setdefault(k[0],collections.Counter());stats['replayRecords']+=1
 for action,t,c in zip(failed,row['traces'],row['failures']):
  assert t['view']['me']['id']=='p1' and t['at']==t['view']['elapsedMs']==action['at']==c['at'] and t['action']==action['action']==c['action'] and t['accepted']==action['accepted'] and t['attackFailure']
  assert all(e['vis']['to']=='players' and 'p1' in e['vis']['ids'] and e['at']<=t['at'] for e in t['privateEvidence'])
  assert all(e['vis']['to']=='all' and e['at']<=t['at'] for e in t['publicProtection'])
  assert all(e['vis']['to']=='all' or e['vis']['to']=='players' and 'p1' in e['vis']['ids'] for e in t['ownResultEvents'])
  target,name=t['action']['target'],t['action']['name'];previous=dict(dict(t['lastFailure']).get(target,[])).get(name)
  known=dict(t['known']).get(target);assert c['knownName']==known and c['candidates']==dict(t['candidates']).get(target,[]) and c['previousSameNameFailureAt']==previous
  assert c['actor']==t['view']['me']['character'] and c['advancedLevel']==next((s['level'] for s in t['view']['me']['skills'] if s['key']=='advanced_attack'),None)
  evidence=[e['seq'] for e in t['privateEvidence'] if (previous is None or e['at']>previous) and any(f['player']==target and f.get('character')==name and not f.get('oneOf') for f in e.get('facts',[]))];assert c['newDirectIdentitySinceFailure']==evidence
  kinds=[e['kind'] for e in t['ownResultEvents']];assert c['warning']==('attack.fail.warn' in kinds) and c['death']==('attack.fail.death' in kinds)
  assert c['hasPublicTargetIdentity']==any(p['id']==target and p['revealed']==name for p in t['view']['players'])
  stats['failures']+=1;stats['warnings']+=c['warning'];stats['deaths']+=c['death'];stats['knownNameFailures']+=known==name
  if previous is not None:
   assert any(e['kind']=='attack.fail.self' and e['at']==previous and e.get('data',{}).get('target')==target and e.get('data',{}).get('name')==name for e in t['privateEvidence'])
   stats['sameNameRepeat']+=1
   if c['death'] and known is None and not evidence and not c['hasPublicTargetIdentity'] and c['advancedLevel']==2:
    stats['repeatWarningDeathWithoutNewDirect']+=1;repeat_cases.add(k[:-1]);repeat_rows.append({'fixture':row['fixture'],'style':row['style'],'variant':row['variant'],**c})
assert seen==set(expected)
for stats in modes.values():total.update(stats)
print(json.dumps({'kind':'verified-own-failure-replay-audit','newResearchExecutions':0,'replayGames':23,'originalResultsEqual':23,'modes':modes,'totals':total,'uniqueRepeatSituations':len(repeat_cases),'repeatRows':repeat_rows,'policySelection':False,'promotionEvidence':False,'inputGzSHA256':sha(a.raw.read_bytes()),'replayGzSHA256':sha(a.replay.read_bytes()),'verifierSHA256':sha(pathlib.Path(__file__).read_bytes())},ensure_ascii=False,indent=2))
