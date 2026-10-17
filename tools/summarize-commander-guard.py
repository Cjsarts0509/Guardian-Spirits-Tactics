"""Describe guard fulfillment separately from fixed-opponent outcomes; audit real first divergence."""
import json,gzip,pathlib,sys,collections,hashlib
path,verified,out=map(pathlib.Path,sys.argv[1:4]);raw=path.read_bytes();raw=gzip.decompress(raw) if path.suffix=='.gz' else raw;d=json.loads(raw);v=json.loads(verified.read_text());candidate='knownCommanderGuardBeforeAlly'
assert d['variants']==['baseline','control',candidate] and d['complete'] and v['publicationVerified'] and v['fingerprint']==d['fingerprint']
key=lambda x:(x['mode'],x['style'],x['result']['game']['fixture']['seed'],x['result']['game']['fixture']['reversed'],x['result']['game']['fixture']['currentSide'])
pairs=collections.defaultdict(dict)
for x in d['records']:pairs[key(x)][x['variant']]=x['result']
summary={'candidate':candidate,'executions':d['executions'],'sourceFingerprint':d['fingerprint'],'snapshotSHA256':hashlib.sha256(raw).hexdigest(),'behavior':{},'pairedPerformance':{},'firstDivergences':[],'newResearchExecutionsFromAnalysis':0}
for variant in ['control',candidate]:
 records=[x['result']for x in d['records']if x['variant']==variant];ds=[t for r in records for t in r['guardDecisions']];eligible=[t for t in ds if t['eligible']]
 summary['behavior'][variant]={'activeGuardDecisions':len(ds),'reasons':dict(collections.Counter(t['reason']for t in ds)),'eligible':len(eligible),'selectedAtEligible':sum(t['selectedGuard']for t in eligible),'successfulAtEligible':sum(bool(t['success'])for t in eligible),'wrongAtEligible':sum(t['selectedGuard'] and (t['actualName']!=t['knownName'] or t['actualSide']!=t['ownSide'])for t in eligible),'rejectedAtEligible':sum(t['selectedGuard'] and not t['accepted']for t in eligible),'gamesWithEligibleOpportunity':sum(any(t['eligible']for t in r['guardDecisions'])for r in records),'byCharacter':{role:{'eligible':sum(t['character']==role for t in eligible),'selected':sum(t['character']==role and t['selectedGuard']for t in eligible),'success':sum(t['character']==role and bool(t['success'])for t in eligible)}for role in ['consume','kumarin']}}
better=worse=tied=unchanged=changed=0
for k,pair in pairs.items():
 c,n=pair['control'],pair[candidate];score=lambda r:.5 if r['game']['winnerPolicy'] is None else int(r['game']['winnerPolicy']=='current')
 delta=score(n)-score(c);better+=delta>0;worse+=delta<0;tied+=delta==0
 has=any(t['eligible']for t in n['guardDecisions'])
 if not has:
  assert all(c[field]==n[field]for field in ['game','resources','safety','actions']);unchanged+=1
 else:
  changed+=1;aa,bb=c['actions'],n['actions'];i=0
  while i<min(len(aa),len(bb)) and aa[i]==bb[i]:i+=1
  assert i<min(len(aa),len(bb));old,new=aa[i],bb[i];assert old['at']==new['at'] and old['player']==new['player']
  proof=[t for t in n['guardDecisions']if t['eligible'] and t['at']==new['at'] and t['player']==new['player']];assert len(proof)==1;proof=proof[0]
  assert proof['originalAction']==old['action'] and proof['chosenAction']==new['action'] and old['action']['skill']=='ally'
  summary['firstDivergences'].append({'fixtureKey':list(k),'commonActionPrefix':i,'at':new['at'],'player':new['player'],'controlAction':old['action'],'candidateAction':new['action'],'scoreDelta':delta})
summary['pairedPerformance']={'pairs':len(pairs),'better':better,'worse':worse,'tied':tied,'intervenedGames':changed,'nonintervenedEntireGamesIdentical':unchanged,'contrasts':v['contrasts']}
quality=summary['behavior'][candidate];summary['functionalFulfillmentPassed']=quality['eligible']>0 and quality['eligible']==quality['successfulAtEligible'] and quality['wrongAtEligible']==quality['rejectedAtEligible']==0
summary['limits']=['Candidate and control opportunity counts come from their own reached trajectories; do not interpret them as the same denominator.','Original OFF choice at a reached state is observational only; first-divergence matches validate the real pair before its first intervention.','Earlier guard success is not proof of improved win rate, faction balance, or human performance.']
out.write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:z for k,z in summary.items()if k!='firstDivergences'},ensure_ascii=False,indent=2))
