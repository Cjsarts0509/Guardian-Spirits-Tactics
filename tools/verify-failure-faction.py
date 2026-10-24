"""061 independent own-evidence links and set arithmetic; not an independent engine."""
import copy,gzip,hashlib,json,sys
from pathlib import Path
def read(p):
 b=Path(p).read_bytes();return gzip.decompress(b) if str(p).endswith('.gz') else b
def pack(x):return json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()
def sha(b):return hashlib.sha256(b).hexdigest()
def key(x):return json.dumps([x['fixture'],x['style'],x['variant']],sort_keys=True)
FIELDS=['player','at','action','accepted','error','side','character','beforeMana','afterMana','maxMana','nominalMana','receiptKinds']
def verify(d,original,live,src_sha,live_sha):
 assert d['kind']=='round061-exact-own-failure-faction-probes' and d['completed']
 assert d['newResearchExecutions']==d['newResearchSeeds']==0
 assert d['inputSHA256']==src_sha and d['liveSHA256']==live_sha and d['settings']==original['settings']
 assert d['options']=={'originalControl':{'rememberOwnDelayedCheck':True},'originalCandidate':{'verifyIncomingAllies':'commander-report-first','rememberOwnDelayedCheck':True},'probe':{'rememberOwnDelayedCheck':True,'learnOwnDelayedFailureFaction':True}}
 assert d['optionsSHA256']==sha(pack(d['options']))
 rules=d['rules'];assert len(rules)==12 and len({r['role'] for r in rules})==12
 assert sum(not r['accepted'] for r in rules)==1
 assert sum(r['accepted'] and r['result']['data']['success'] for r in rules)==4
 assert sum(r['accepted'] and not r['result']['data']['success'] for r in rules)==7
 for r in rules:
  if not r['accepted']:assert r['role']=='kanulla' and r['result'] is None;continue
  event=r['result'];actor=r['view']['me']['id'];target=r['target']
  assert event['vis']=={'to':'players','ids':[actor]} and event['data']['target']==target and event['at']==61000
  assert event['data']['success']==(r['actualSide']==2)
  old=dict(r['candidates']);new=dict(r['candidateCandidates'])
  if event['data']['success']:assert r['known']==r['candidateKnown'] and old==new
  else:
   assert len(old[target])==11 and len(new[target])==7 and r['role'] in new[target]
   sides={p['key']:p['side'] for p in r['view']['roster']}
   assert new[target]==[n for n in old[target] if sides[n]==1] and target not in dict(r['candidateKnown'])
 old={key(r):r for r in original['records']}
 selected=[r for r in live['records'] if any(e['firstResultSeen'] and e['firstResultSeen']['record']['status']=='failed' for e in r['episodes'])]
 assert [key(r) for r in d['records']]==[key(r) for r in selected]
 assert len(selected)==d['targetRecords']
 totals={v:dict(games=0,actions=0,probes=0,failedResults=0,eligible=0,reduced=0,actionChanged=0,newExactIdentities=0,removedNames=0,candidateCommands=0,candidateRejected=0) for v in ['control','candidate']}
 for r,p in zip(d['records'],selected):
  o=old[key(r)];t=totals[r['variant']];t['games']+=1;t['actions']+=r['actions'];t['probes']+=len(r['rows'])
  assert r['game']==o['game']==p['game'] and r['observerOnOffMatched']
  actions=[{f:a[f] for f in FIELDS} for a in o['actions']]
  assert r['actions']==len(actions) and r['actionsSHA256']==sha(pack(actions))==p['actionsSHA256']
  expected={}
  for e in p['episodes']:
   seen=e['firstResultSeen']
   if seen and seen['record']['status']=='failed':expected[(e['actor'],seen['at'],seen['stage'],e['receipt']['seq'])]=e
  assert r['expectedFailedResults']==len(expected)
  observed=set()
  for row in r['rows']:
   actor=row['actor'];assert row['actualMemoryRngAndEngineUnchanged'] and row['view']['me']['id']==actor
   assert row['view']['elapsedMs']==row['at'] and row['view']['me']['alive'] and row['view']['phase']=='running'
   assert row['stage'] in ['primary','chat'] and row['receipts']
   assert all(e['vis']['to']=='all' or e['vis']['to']=='players' and actor in e['vis']['ids'] for e in row['events'])
   sides={c['key']:c['side'] for c in row['view']['roster']}
   for rec in row['receipts']:
    k=(actor,row['at'],row['stage'],rec['receipt']['seq']);assert k in expected and k not in observed;observed.add(k)
    e=expected[k];assert rec['receipt']==e['receipt'] and rec['result']==e['result']
    assert rec['receipt']['vis']==rec['result']['vis']=={'to':'players','ids':[actor]}
    assert rec['result']['data']['success'] is False and rec['result']['at']==rec['receipt']['at']+60000
    assert rec['result']['data']['target']==rec['receipt']['data']['target']
    assert rec['removed']==[c for c in rec['oldCandidates'] if c not in rec['newCandidates']]
    eligible=any(sides[c]==2 for c in rec['oldCandidates']) and any(sides[c]==1 for c in rec['oldCandidates'])
    assert rec['eligible']==eligible
    if eligible:assert rec['newCandidates'] and all(sides[c]==1 for c in rec['newCandidates'])
    t['failedResults']+=1;t['eligible']+=eligible;t['reduced']+=eligible and bool(rec['removed'])
   before=dict(row['oldKnown']);after=dict(row['newKnown'])
   assert row['newExactIdentities']==[{'target':i,'name':n} for i,n in row['newKnown'] if before.get(i)!=n]
   for change in row['removed']:
    assert change['actual'] not in change['removed'] and not set(change['remaining'])&set(change['removed'])
   t['newExactIdentities']+=len(row['newExactIdentities']);t['removedNames']+=sum(len(c['removed']) for c in row['removed'])
   changed=row['oldAction']!=row['candidateAction'];assert row['actionChanged']==changed;t['actionChanged']+=changed
   assert (row['candidateCommand'] is None)==(row['candidateAction'] is None)
   if row['candidateCommand']:
    command=row['candidateCommand'];t['candidateCommands']+=1;t['candidateRejected']+=not command['accepted']
    assert (command['error'] is None)==command['accepted']
  assert observed==set(expected)
 assert sum(t['failedResults'] for t in totals.values())==110
 assert d['summary']==totals
 return {'valid':True,'byVariant':totals,'rules':{'acceptedFailure':7,'acceptedSuccess':4,'rejected':1},'newResearchExecutions':0,
 'scope':'Cross-file own receipt/result/time links and candidate set arithmetic. Runtime candidate execution and hidden-truth assertions are recorded witnesses, not a second independent engine.'}
def main():
 raw,src,live=map(read,sys.argv[1:4]);d=json.loads(raw);args=(json.loads(src),json.loads(live),sha(src),sha(live));s=verify(d,*args)
 first=lambda x:x['records'][0]['rows'][0]
 rec=lambda x:first(x)['receipts'][0]
 changes=[lambda x:x.update(newResearchExecutions=1),lambda x:x.update(inputSHA256='bad'),lambda x:x.update(liveSHA256='bad'),
 lambda x:x['records'][0].update(actionsSHA256='bad'),lambda x:rec(x)['receipt']['data'].update(target='wrong'),
 lambda x:rec(x)['result']['data'].update(success=True),lambda x:first(x).update(at=-1),
 lambda x:rec(x).update(eligible=not rec(x)['eligible']),lambda x:first(x).update(actionChanged=not first(x)['actionChanged']),
 lambda x:x['summary']['control'].update(failedResults=-1)]
 for change in changes:
  bad=copy.deepcopy(d);change(bad)
  try:verify(bad,*args)
  except AssertionError:continue
  raise AssertionError('tamper accepted')
 s.update(rawSHA256=sha(raw),tamperRejected=len(changes))
 if len(sys.argv)>4:Path(sys.argv[4]).write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(s,ensure_ascii=False))
if __name__=='__main__':main()
