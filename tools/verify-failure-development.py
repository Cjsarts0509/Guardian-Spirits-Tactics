"""062 independent storage, design, own-evidence, resource and paired-performance audit."""
import collections,gzip,hashlib,json,pathlib,random,subprocess,sys,copy

def read(p):
 b=pathlib.Path(p).read_bytes();return gzip.decompress(b) if str(p).endswith('.gz') else b
def enc(x):return json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()
def sha(x):return hashlib.sha256(x).hexdigest()
def score(r):return .5 if r['game']['winner'] is None else int(r['game']['winnerPolicy']=='current')
def ci(xs):
 rng=random.Random(0x475354);x=sorted(sum(rng.choices(xs,k=len(xs)))/len(xs) for _ in range(10000));return [x[250],x[9749]]
def validate(r):
 f=r['fixture'];g=r['game'];roles={x['id']:x for x in r['roles']};actions=r['actions'];mine=[a for a in actions if a['side']==f['currentSide']]
 assert len(roles)==f['count'] and g['fixture']==f and g['winner'] in [None,1,2]
 assert g['winnerPolicy']==(None if g['winner'] is None else 'current' if g['winner']==f['currentSide'] else 'reference')
 assert len(r['memoryTraceSHA256'])==64
 for side,label in [(f['currentSide'],'current'),(3-f['currentSide'],'reference')]:
  aa=[a for a in actions if a['side']==side];assert g['stats'][label]['attempted']==len(aa) and g['stats'][label]['accepted']==sum(a['accepted'] for a in aa) and g['stats'][label]['rejected']==sum(not a['accepted'] for a in aa)
 for a in actions:
  assert a['character']==roles[a['player']]['character'] and a['side']==roles[a['player']]['side'] and 0<=a['at']<=g['elapsedMs']
  assert a['accepted']==(a['error'] is None) and 0<=a['beforeMana']<=a['maxMana'] and 0<=a['afterMana']<=a['maxMana']
  if a['reportTarget']:assert a['reportActual']==roles[a['reportTarget']]['character'] and a['action']['type']=='chat'
 expected=dict(nominalSkillMana=sum(a['nominalMana'] for a in mine if a['accepted'] and a['action']['type']=='skill'),netSkillManaDelta=sum(a['afterMana']-a['beforeMana'] for a in mine if a['accepted'] and a['action']['type']=='skill'),attackFailures=sum('attack.fail.self' in a['receiptKinds'] for a in mine),rejected=sum(not a['accepted'] for a in mine),reports=sum(bool(a['reportTarget']) for a in mine),falseReports=sum(bool(a['reportTarget']) and (a['reportedName']!=a['reportActual'] or a['reportKnown']!=a['reportActual']) for a in mine))
 assert expected==r['resources']
 episodes={};intake=collections.Counter()
 for e in r['episodes']:
  receipt=e['receipt'];actor=e['actor'];target=receipt['data']['target'];seq=receipt['seq'];episodes[actor,seq]=e
  assert receipt['kind']=='skill.chaos_hex.self' and receipt['vis']=={'to':'players','ids':[actor]} and e['due']==receipt['at']+60000
  assert any(a['player']==actor and a['at']==receipt['at'] and a['accepted'] and a['action'].get('skill')=='chaos_hex' and a['action']['target']==target for a in actions)
  result=e['result']
  if result:
   assert result['kind']=='skill.chaos_hex.result' and result['vis']==receipt['vis'] and result['at']==e['due'] and result['data']['target']==target
   assert result['data']['success']==(roles[target]['side']==2)
  for field in ['firstReceiptSeen','firstResultSeen']:
   seen=e[field]
   if seen:
    rec=seen['record'];assert rec['target']==target and rec['receiptSeq']==seq and rec['at']==receipt['at'] and rec['due']==e['due'] and seen['at']>=receipt['at']
    if field=='firstResultSeen':assert result and seen['at']>=result['at'] and rec['result']=={'seq':result['seq'],'at':result['at'],'success':result['data']['success']}
  classification='observed' if e['firstResultSeen'] else ('no-later-live-update' if e['aliveAtResultCollection'] else 'postmortem-result') if result else 'ended-before-result'
  assert e['classification']==classification;intake[classification]+=1;intake['receipts']+=1;intake['receiptObserved']+=e['firstReceiptSeen'] is not None;intake['results']+=result is not None
  if e['firstResultSeen']:intake['successObserved' if result['data']['success'] else 'failureObserved']+=1
 counts=collections.Counter();seenfail=set()
 for p in r['probes']:
  actor=p['actor'];view=p['view'];assert p['actualMemoryUnchanged'] and view['me']['id']==actor and view['elapsedMs']==p['at'] and view['phase']=='running' and view['me']['alive']
  for q in view['players']:assert not {'mana','character','flags','skills','extraLives'}&set(q)
  for event in p['events']:assert event['vis']['to']=='all' or event['vis']['to']=='players' and actor in event['vis']['ids']
  sides={x['key']:x['side'] for x in view['roster']}
  assert p['changed']==(p['offAction']!=p['onAction']) and p['rngChanged']==(p['offRng']!=p['onRng'])
  assert p['chosenAction']==p['onAction' if r['variant']=='candidate' else 'offAction']
  if p['chosenAction']:
   a=actions[p['ordinal']];assert a['player']==actor and a['at']==p['at'] and a['action']==p['chosenAction'] and a['stage']==p['stage']
  counts['choiceChanged']+=p['changed'];counts['rngChanged']+=p['rngChanged']
  for evidence in p['evidence']:
   k=actor,evidence['receiptSeq'];assert k not in seenfail;seenfail.add(k);ep=episodes[k];first=ep['firstResultSeen']
   assert first['at']==p['at'] and first['stage']==p['stage'] and ep['result']['data']['success'] is False
   assert evidence['result']==first['record']['result'] and evidence['target']==ep['receipt']['data']['target']
   names=evidence['oldCandidates'];remaining=evidence['newCandidates'];eligible=any(sides[n]==1 for n in names) and any(sides[n]==2 for n in names)
   assert evidence['eligible']==eligible and evidence['removed']==[n for n in names if n not in remaining]
   if eligible:assert remaining and all(sides[n]==1 for n in remaining)
   counts['firstFailures']+=1;counts['eligible']+=eligible;counts['reduced']+=eligible and bool(evidence['removed'])
  old=dict(p['oldKnown']);assert p['newExact']==[[t,n] for t,n in p['newKnown'] if old.get(t)!=n]
  for target,name in p['newExact']:assert roles[target]['character']==name
  for change in p['removals']:
   assert change['actual']==roles[change['target']]['character'];counts['wrongNewElimination']+=change['actual'] in change['removed']
 expected_fail={(e['actor'],e['receipt']['seq']) for e in r['episodes'] if e['firstResultSeen'] and e['firstResultSeen']['record']['status']=='failed'}
 assert seenfail==expected_fail
 for k in ['firstFailures','eligible','reduced','choiceChanged','rngChanged','wrongNewElimination']:assert r['counters'][k]==counts[k]
 assert r['counters']['knownChecks']>=r['counters']['wrongKnown']>=0
 for follow in r['followups']:
  p=r['probes'][follow['probe']];a=actions[follow['ordinal']]
  assert (follow['ordinal']>p['ordinal'] or follow['ordinal']==p['ordinal'] and p['chosenAction'] is None) and follow['actor']==p['actor']==a['player'] and follow['action']==a['action'] and follow['at']==a['at'] and follow['accepted']==a['accepted']
  assert follow['at']>=p['at'] and follow['target'] in {e['target'] for e in p['evidence']}|{t for t,n in p['newExact']}
  assert follow['target']==(a['action'].get('target') if a['action']['type']=='skill' else a['reportTarget'])
  assert follow['actualName']==roles[follow['target']]['character']
  if a['action']['type']=='chat':assert follow['knownName']==a['reportKnown']
  if follow['knownName']:assert follow['knownName']==follow['actualName']
 return intake

def verify(path,journal,publication,partial=False):
 raw,jb,pb=map(read,[path,journal,publication]);d=json.loads(raw);pub=json.loads(pb)
 assert d['kind']=='own-failure-faction-development' and d['phase']=='development' and d['variants']==['baseline','control','candidate']
 assert d['options']=={'baseline':{},'control':{'verifyIncomingAllies':'commander-report-first','rememberOwnDelayedCheck':True},'candidate':{'verifyIncomingAllies':'commander-report-first','rememberOwnDelayedCheck':True,'learnOwnDelayedFailureFaction':True}}
 assert d['optionsSHA256']==sha(enc(d['options'])) and d['settings']=={'tickMs':250,'activity':.012,'limitMs':5400000}
 assert d['design']==dict(unit='seed',fixedOpponent=True,identicalPolicySelfplay=False,playerCount='8+(seed-start)%5',skillValuesChanged=False,promotionEvidence=False)
 meta={k:v for k,v in d.items() if k not in ['fingerprint','executions','complete','records','journalSha256']}
 assert d['fingerprint']==sha(enc(meta));lines=jb.splitlines();assert json.loads(lines[0])==dict(type='header',fingerprint=d['fingerprint'],meta=meta)
 assert [json.loads(x) for x in lines[1:]]==d['records'] and d['journalSha256']==sha(jb)
 assert pub==dict(version=2,fingerprint=d['fingerprint'],executions=d['executions'],complete=d['complete'],snapshotSHA256=sha(raw),journalSHA256=sha(jb))
 sources={x.removeprefix('packages/rules/') for x in subprocess.check_output(['git','ls-tree','-r','--name-only',d['sourceRef'],'packages/rules/src'],text=True).splitlines() if x.endswith('.ts')}
 sources|={'scripts/'+p for p in ['failure-development.ts','failure-development-run.ts','sender-development.ts','sender-arbitration-witness.ts','cooperative-store.ts','league-runner.ts','baselines/pre-cooperative.ts','claim-opponents.ts']}
 assert set(d['sourceHashes'])==sources and set(d['verificationHashes'])=={'tools/verify-failure-development.py','tools/test-failure-development.py'}
 for p,h in d['sourceHashes'].items():assert h==sha(subprocess.check_output(['git','show',d['sourceRef']+':packages/rules/'+p]))
 for p,h in d['verificationHashes'].items():assert h==sha(subprocess.check_output(['git','show',d['sourceRef']+':'+p]))
 assert d['executions']==len(d['records']) and (partial or d['complete'] and d['executions']==d['count']*144)
 cells={};byseed=collections.defaultdict(lambda:collections.defaultdict(list));pairs={};bycount={};byside={}
 for r in d['records']:
  f=r['fixture'];v=r['variant'];assert v in d['variants'] and r['style'] in ['truthful','bluff','skill-aware-bluff'] and f['mode'] in ['civil_war','primordial','lidellut','troll']
  assert d['start']<=f['seed']<d['start']+d['count'] and f['count']==8+(f['seed']-d['start'])%5 and f['currentSide'] in [1,2] and type(f['reversed']) is bool
  key=(f['mode'],r['style'],f['seed'],f['reversed'],f['currentSide']);assert (key,v) not in pairs;pairs[key,v]=r;intake=validate(r)
  cell=cells.setdefault(v,{}).setdefault(f['mode'],dict(games=0,wins=0,score=0,unfinished=0,resources=collections.Counter(),behavior=collections.Counter(),intake=collections.Counter(),followups=collections.Counter()))
  cell['games']+=1;cell['wins']+=r['game']['winnerPolicy']=='current';cell['score']+=score(r);cell['unfinished']+=r['game']['winner'] is None
  cell['resources'].update(r['resources']);cell['behavior'].update(r['counters']);cell['intake'].update(intake)
  cell['followups'].update(kind for _,kind in {(x['ordinal'],x['kind']) for x in r['followups'] if x['knownName'] is not None})
  byseed[v][f['seed']].append(score(r))
  for dest,k in [(bycount,f"{v}/{f['mode']}/{f['count']}"),(byside,f"{v}/{f['mode']}/{f['currentSide']}")]:
   x=dest.setdefault(k,dict(games=0,wins=0,unfinished=0));x['games']+=1;x['wins']+=r['game']['winnerPolicy']=='current';x['unfinished']+=r['game']['winner'] is None
 contrasts={}
 for left in ['control','baseline']:
  deltas=[];improved=worsened=tied=0
  for seed in range(d['start'],d['start']+d['count']):
   a,b=byseed[left][seed],byseed['candidate'][seed]
   if a and len(a)==len(b):deltas.append((sum(b)-sum(a))/len(a))
  for (k,v),r in pairs.items():
   if v!='candidate' or (k,left) not in pairs:continue
   delta=score(r)-score(pairs[k,left]);improved+=delta>0;worsened+=delta<0;tied+=delta==0
  contrasts[left]=dict(seedDeltas=deltas,meanDifference=sum(deltas)/len(deltas) if deltas else None,seed95=ci(deltas) if deltas else None,improved=improved,worsened=worsened,tied=tied)
 same=collections.Counter()
 for (k,v),r in pairs.items():
  if v!='candidate' or (k,'control') not in pairs:continue
  c=pairs[k,'control'];same['paired']+=1;same['sameFullGameActionsResources']+=all(r[x]==c[x] for x in ['game','actions','resources']);same['outsideTrollCompared']+=r['fixture']['mode']!='troll'
  if r['fixture']['mode']!='troll':assert all(r[x]==c[x] for x in ['game','actions','resources','memoryTraceSHA256'])
 return dict(kind=d['kind'],sourceRef=d['sourceRef'],start=d['start'],count=d['count'],executions=d['executions'],complete=d['complete'],variants=cells,byCount=bycount,bySide=byside,contrasts=contrasts,paths=same,snapshotSHA256=sha(raw),journalSHA256=sha(jb),promotionEvidence=False,limitations=['Synthetic fixed-opponent development; no humans or same-policy balance.','Same-moment OFF/ON clones measure local choice only, whole-game contrasts are separate.','Repeated knowledge checks are not independent identities; followups deduplicated within each game.'])
if __name__=='__main__':
 result=verify(*sys.argv[1:4],partial='--partial' in sys.argv);pathlib.Path(sys.argv[4]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k in ['executions','complete','contrasts','paths','snapshotSHA256']},ensure_ascii=False))
