"""Read-only first-divergence audit of completed development; never selects a policy or runs a game."""
import argparse,collections,gzip,hashlib,json,pathlib,re,subprocess,sys
p=argparse.ArgumentParser();p.add_argument('raw',type=pathlib.Path);p.add_argument('out',type=pathlib.Path);p.add_argument('--journal-path',type=pathlib.Path,required=True);p.add_argument('--source-ref',required=True);a=p.parse_args()
assert re.fullmatch('[0-9a-f]{40}',a.source_ref)
verified=json.loads(subprocess.check_output([sys.executable,'tools/verify-claim-commitment.py',str(a.raw),'--journal-path',str(a.journal_path),'--source-ref',a.source_ref]))
raw=a.raw.read_bytes();d=json.loads(gzip.decompress(raw) if a.raw.suffix=='.gz' else raw)
assert d['complete'] and d['phase']=='development' and d['variants']==['baseline','control','directCheckFollowup']
assert verified['executions']==d['executions'] and verified['publicationVerified'] and not verified['promotionEvidence']
hash=lambda b:hashlib.sha256(b).hexdigest();canonical=lambda x:json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()
pairs=collections.defaultdict(dict)
for x in d['records']:
 f=x['result']['game']['fixture'];key=(x['mode'],x['style'],f['seed'],f['reversed'],f['currentSide']);assert x['variant'] not in pairs[key];pairs[key][x['variant']]=x['result']
rows=[];cohorts=collections.defaultdict(collections.Counter);counts=collections.Counter();events=collections.Counter();changed=[]
score=lambda x:.5 if x['game']['winnerPolicy'] is None else int(x['game']['winnerPolicy']=='current')
for key,pair in pairs.items():
 assert set(pair)==set(d['variants']);control,candidate=pair['control'],pair['directCheckFollowup'];reactions=candidate['checkReactions'];delta=score(candidate)-score(control);outcome='better' if delta>0 else 'worse' if delta<0 else 'tied';cohort='multiple' if len(reactions)>1 else 'one' if reactions else 'none'
 cohorts[cohort][outcome]+=1;counts['pairs']+=1;counts['reactions']+=len(reactions);counts['actionsChanged']+=candidate['actions']!=control['actions'];counts['outcomesChanged']+=delta!=0
 for t in reactions:events[t['event']['kind']]+=1
 row={'key':key,'reactions':len(reactions),'outcome':outcome,'scoreDifference':delta,'controlScore':score(control),'candidateScore':score(candidate)}
 if not reactions:
  identical=control==candidate;row['allObservedEqual']=identical;counts['nonInterventionPairs']+=1;counts['nonInterventionEqual']+=identical
 else:
  first=reactions[0];assert first['at']==min(t['at'] for t in reactions)
  index=next(i for i,x in enumerate(candidate['actions']) if x['player']==first['player'] and x['at']==first['at'] and x['action']==first['chosenAction'])
  prefix=candidate['actions'][:index];same=prefix==control['actions'][:index];counts['interventionPairs']+=1;counts['prefixEqual']+=same
  action=candidate['actions'][index];row.update(prefixLength=index,prefixEqual=same,prefixSHA256=hash(canonical(prefix)),first={'player':first['player'],'at':first['at'],'receivedAt':first['receivedAt'],'eventKind':first['event']['kind'],'target':first['target'],'name':first['name'],'action':first['chosenAction'],'accepted':action['accepted'],'beforeMana':action['beforeMana'],'afterMana':action['afterMana'],'nominalMana':action['nominalMana'],'sameStateOriginalAction':first['originalAction']})
  assert first['originalAction'] is None and 1000<=first['at']-first['receivedAt']<=5000
  counts['firstAccepted']+=action['accepted'];counts['firstOriginalNull']+=first['originalAction'] is None
  if not same:row['firstPrefixMismatch']=next((i for i,(x,y) in enumerate(zip(prefix,control['actions'])) if x!=y),len(control['actions']))
 if delta:changed.append(row)
 rows.append(row)
assert counts['pairs']==d['count']*4*3*4 and counts['interventionPairs']+counts['nonInterventionPairs']==counts['pairs']
passed=counts['prefixEqual']==counts['interventionPairs'] and counts['nonInterventionEqual']==counts['nonInterventionPairs']
lines=b''.join(canonical(x)+b'\n' for x in rows);detail=a.out.with_suffix('.games.ndjson.gz');detail.parent.mkdir(parents=True,exist_ok=True);detail.write_bytes(gzip.compress(lines,mtime=0))
result={'kind':'completed-development-first-divergence-audit','sourceRef':a.source_ref,'newResearchExecutions':0,'policySelection':False,'promotionEvidence':False,'complete':True,'allChecksPassed':passed,'counts':dict(counts),'cohorts':dict(cohorts),'eventKinds':dict(events),'changedOutcomes':changed,'rawGzSHA256':hash(raw),'journalGzSHA256':hash(a.journal_path.read_bytes()),'verifiedFingerprint':verified['fingerprint'],'detailFile':str(detail),'detailGzSHA256':hash(detail.read_bytes()),'auditSourceSHA256':hash(pathlib.Path(__file__).read_bytes()),'limitations':['First-action prefix equality is an actual common-trajectory check, not a replay of hidden state or another bot memory.','Whole-policy outcome differences include later reactions and RNG paths; they do not identify the isolated combat or mana value of the first action.','Post-treatment one/multiple cohorts cannot be used to choose a subgroup or promote a policy.','This is development-only descriptive analysis; no final sample is read or retuned.']}
a.out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['allChecksPassed','counts','cohorts','eventKinds']},ensure_ascii=False));raise SystemExit(0 if passed else 1)
