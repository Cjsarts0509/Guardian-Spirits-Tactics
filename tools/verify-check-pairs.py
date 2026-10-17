"""Independent receipts, single intervention, own RNG, paired hashes, source and publication checks."""
import argparse,collections,gzip,hashlib,json,pathlib,random,subprocess
p=argparse.ArgumentParser();p.add_argument('path',type=pathlib.Path);p.add_argument('--source-ref');p.add_argument('--journal-path',type=pathlib.Path,required=True);p.add_argument('--allow-partial',action='store_true');a=p.parse_args()
def read(p):
 b=p.read_bytes();return gzip.decompress(b) if p.suffix=='.gz' else b
hash=lambda b:hashlib.sha256(b).hexdigest();d=json.loads(read(a.path));assert d['kind']=='public-p1-first-private-check-single-attack' and d['phase']=='development' and d['selectedPublicPlayer']=='p1' and d['variants']==['control','single']
assert d['design']=={'singleExtraSkill':True,'preserveOriginalRng':True,'noExtraChat':True,'selection':'global_seed99LowerPositive','minInterventions':96,'minSeeds':16,'bootstrapSamples':10000,'bootstrapSeed':0x475354,'policySelection':False}
files=subprocess.check_output(['git','ls-tree','-r','--name-only',a.source_ref,'packages/rules/src'],text=True).splitlines() if a.source_ref else [str(x) for x in pathlib.Path('packages/rules/src').rglob('*.ts')]
expected={x.removeprefix('packages/rules/') for x in files if x.endswith('.ts')}|{'scripts/'+x for x in ['cooperative-check-pairs.ts','cooperative-check-single.ts','cooperative-claim-intervention.ts','cooperative-store.ts','league-runner.ts','baselines/pre-cooperative.ts','claim-opponents.ts']}
assert set(d['sourceHashes'])==expected and set(d['auxiliarySourceHashes'])=={'tools/verify-check-pairs.py','tools/run-cooperative-generations.py'}
for group,prefix in [('sourceHashes','packages/rules/'),('auxiliarySourceHashes','')]:
 for path,sha in d[group].items():
  assert '..' not in pathlib.PurePosixPath(path).parts;source=subprocess.check_output(['git','show',a.source_ref+':'+prefix+path]) if a.source_ref else pathlib.Path(prefix+path).read_bytes();assert hash(source)==sha,path
meta={k:v for k,v in d.items() if k not in ['fingerprint','complete','executions','journalSha256','records']};assert hash(json.dumps(meta,ensure_ascii=False,separators=(',',':')).encode())==d['fingerprint']
out={'format':1,'phase':'development','complete':d['complete'],'executions':len(d['records']),'fingerprint':d['fingerprint'],'start':d['start'],'seeds':d['count'],'promotionEvidence':False,'developmentGatePassed':False,'holdoutGatePassed':False,'diagnosticGatePassed':False,'contrasts':{},'modes':{},'intervenedPairs':0,'nonIntervenedEqualPairs':0};seen=set();pairs=collections.defaultdict(dict);scores=collections.defaultdict(list);intervened_seeds=set();changed=collections.Counter()
def score(r):return .5 if r['game']['winnerPolicy'] is None else int(r['game']['winnerPolicy']=='current')
for x in d['records']:
 mode,style,v=x['mode'],x['style'],x['variant'];r=x['result'];g,pt,res=r['game'],r['point'],r['resources'];f=g['fixture'];assert v in d['variants'] and mode in ['civil_war','primordial','lidellut','troll'] and style in ['truthful','bluff','skill-aware-bluff'] and f['mode']==mode
 key=(mode,style,f['seed'],f['reversed'],f['currentSide']);assert (key,v) not in seen;seen.add((key,v));pairs[key][v]=r
 assert d['start']<=f['seed']<d['start']+d['count'] and f['count']==8+(f['seed']-d['start'])%5 and type(f['reversed']) is bool and f['currentSide'] in [1,2]
 assert g['winnerPolicy']==(None if g['winner'] is None else 'current' if g['winner']==f['currentSide'] else 'reference') and 0<=g['elapsedMs']<=d['settings']['limitMs']
 for z in g['stats'].values():assert z['attempted']==z['accepted']+z['rejected']
 b=out['modes'].setdefault(mode,{}).setdefault(v,{'games':0,'scoreSum':0,'unfinished':0,'earlyAttackFailures':0,'safety':collections.Counter()});b['games']+=1;b['scoreSum']+=score(r);b['unfinished']+=g['winner'] is None;b['earlyAttackFailures']+=g['stats']['current']['earlyAttackFailures'];b['safety'].update(r['safety'])
 assert r['forcedChanges']==int(v=='single' and pt is not None)
 if pt:
  assert pt['player']=='p1' and pt['original'] is None and pt['executed']==(pt['action'] if v=='single' else None)
  e=pt['event'];act=pt['action'];before=pt['before'];assert e['kind'] in ['inspect.result','gem.result'] and e['vis']=={'to':'players','ids':['p1']} and e['at']==pt['receivedAt'] and e['seq']==pt['seq']
  assert 1000<=pt['at']-e['at']<=5000 and any(f['player']==act['target'] and f.get('character')==act['name'] and not f.get('oneOf') for f in e['facts'])
  assert act['type']=='skill' and act['skill'] in ['attack','advanced_attack','supreme_attack','soen_chain_murder'] and before['side']==f['currentSide']!=before['targetSide'] and before['knownName']==act['name']
  assert before['skillBlocked'] is None and before['skillCooldown']==0 and before['mana']>=before['skillCost'] and 0<pt['activity']<pt['inactiveDraw']<1
  # The original inactive policy consumes exactly one mulberry32 state increment. Shadow selection cannot replace it.
  rng=(pt['rngBefore']+0x6d2b79f5)&0xffffffff;rng=rng if rng<0x80000000 else rng-0x100000000
  assert pt['rngAfterBaseline']==pt['rngAfterSelection']==rng
  for k in ['stateHash','memoryHash','viewHash']:assert len(pt[k])==64 and set(pt[k])<=set('0123456789abcdef')
  actual=[t for t in r['actions'] if t['at']==pt['at']]
  if v=='single':assert actual and actual[0]['action']==act and pt['accepted']==actual[0]['accepted'] and pt['error']==actual[0]['error']
  else:assert not actual and pt['accepted'] is None and pt['error'] is None
  assert not any(t['action']['type']=='chat' for t in actual)
 else:assert not r['actions'] and res['aliveMs']==res['turns']==0
 skills={};last=-1;attacks=[];failures=0
 for t in r['actions']:
  assert pt and pt['at']<=t['at']<=g['elapsedMs'] and last<=t['at'] and t['accepted']==(t['error'] is None);last=t['at'];act=t['action'];failures+=t['attackFailure']
  if act['type']=='skill':
   z=skills.setdefault(act['skill'],collections.Counter())
   if t['accepted']:
    z['accepted']+=1;z['nominalMana']+=t['nominalMana'];z['netManaDelta']+=t['afterMana']-t['beforeMana']
    if act['skill'] in ['attack','advanced_attack','supreme_attack','soen_chain_murder'] and act.get('target')==pt['action']['target'] and act.get('name')==pt['action']['name']:attacks.append(t['at'])
   else:z['rejected']+=1
 assert res['skills']=={k:{n:z[n] for n in ['accepted','rejected','nominalMana','netManaDelta']} for k,z in skills.items()}
 assert res['acceptedSkillMana']==sum(z['nominalMana'] for z in skills.values()) and res['acceptedSkills']==sum(z['accepted'] for z in skills.values()) and res['rejectedSkills']==sum(z['rejected'] for z in skills.values()) and res['attackFailures']==failures
 assert res['firstSameAttackAt']==(min(attacks) if attacks else None) and res['firstSameAttackDelayMs']==(min(attacks)-pt['at'] if attacks else None)
 receipts=res['turnReceipts'];assert res['turns']==len(receipts) and res['trueNameTurns']==sum(t['trueName'] for t in receipts) and res['trueNameBonusGross']==10*res['trueNameTurns'] and res['incomingAllyManaGross']==10*sum(t['allies'] for t in receipts) and res['turnGainGross']==sum(t['gain'] for t in receipts)
 for t in receipts:assert pt and pt['at']<=t['at']<=g['elapsedMs'] and t['gain']==20+10*t['allies']+10*t['trueName']
 assert 0<=res['trueNameMs']<=res['aliveMs']<=g['elapsedMs']+d['settings']['tickMs']
for key,pair in pairs.items():
 if len(pair)!=2:assert a.allow_partial;continue
 l,r=pair['control'],pair['single'];assert bool(l['point'])==bool(r['point']);delta=score(r)-score(l);scores[key[2]].append(delta)
 if l['point']:
  for k in ['at','player','before','action','event','seq','receivedAt','stateHash','memoryHash','viewHash','rngBefore','rngAfterBaseline','rngAfterSelection','inactiveDraw','activity']:assert l['point'][k]==r['point'][k],k
  out['intervenedPairs']+=1;intervened_seeds.add(key[2]);changed['better' if delta>0 else 'worse' if delta<0 else 'same']+=1
 else:assert l==r;out['nonIntervenedEqualPairs']+=1
assert out['executions']==d['executions'];out['pairs']=sum(len(x)==2 for x in pairs.values());out['intervenedSeeds']=len(intervened_seeds);out['intervenedOutcomes']=changed
for m in out['modes'].values():
 for b in m.values():b['score']=b['scoreSum']/b['games']
if d['complete']:
 assert out['executions']==d['count']*96 and out['pairs']==d['count']*48 and all(len(scores[s])==48 for s in range(d['start'],d['start']+d['count']))
 units=[sum(scores[s]) for s in sorted(scores)];rng=random.Random(0x475354);means=sorted(sum(rng.choices(units,k=len(units)))/len(units)/48 for _ in range(10000));out['contrasts']['single-control']={'difference':sum(units)/len(units)/48,'seedBootstrap95':[means[250],means[9749]],'seedBootstrap99':[means[50],means[9949]]}
 safe=not any(sum(b['safety'].values())+b['earlyAttackFailures'] for m in out['modes'].values() for b in m.values());out['diagnosticGatePassed']=safe and out['intervenedPairs']>=96 and out['intervenedSeeds']>=16 and means[50]>0
elif not a.allow_partial:raise AssertionError('Incomplete')
journal=read(a.journal_path);assert hash(journal)==d['journalSha256'];lines=journal.splitlines();h=json.loads(lines.pop(0));assert h['fingerprint']==d['fingerprint'] and h['meta']==meta and [json.loads(x) for x in lines]==d['records'];out['journalVerified']=True
base=str(a.path).removesuffix('.gz').removesuffix('.json');pub=json.loads(pathlib.Path(base+'.publication.json').read_bytes());assert pub=={'version':2,'fingerprint':d['fingerprint'],'executions':d['executions'],'complete':d['complete'],'snapshotSHA256':hash(read(a.path)),'journalSHA256':hash(journal)};out['publicationVerified']=True
print(json.dumps(out,ensure_ascii=False,indent=2))
