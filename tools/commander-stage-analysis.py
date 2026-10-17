"""Post-hoc observed commander stages, not a policy/rule intervention or tuning set."""
import argparse,collections,gzip,hashlib,json,pathlib
GROUND={'rael','kane'};COMMANDERS=GROUND|{'eltas'};ATTACKS={'attack','advanced_attack','supreme_attack','soen_chain_murder'}
def sha(b):return hashlib.sha256(b).hexdigest()
def phase(at,actor,first,positions,complete):
 if not complete:return 'unobserved_ground_death_timing'
 if first is None:return 'before_first_ground_death'
 if at!=first['at']:return 'before_first_ground_death' if at<first['at'] else 'after_first_ground_death'
 return 'before_first_ground_death' if positions[actor]<=positions[first['attacker']] else 'after_first_ground_death'
def game_row(x):
 r=x['result'];g=r['game'];f=g['fixture'];assert f['mode']=='primordial'
 roles={p['id']:p for p in x['roles']};positions={p['id']:i for i,p in enumerate(x['roles'])};by_role={p['character']:p for p in x['roles']}
 assert COMMANDERS<=set(by_role)
 survivors={p['character']:p['alive'] for p in g['survivors']};assert set(survivors)==set(by_role)
 ground_alive=sorted(c for c in GROUND if survivors[c]);ground_dead=GROUND-set(ground_alive)
 if g['winner']==1:assert ground_alive and not survivors['eltas']
 elif g['winner']==2:assert not ground_alive
 else:assert g['winner'] is None
 kills=[]
 for a in r['actions']:
  act=a['action'];target=roles.get(act.get('target'));assert a['player'] in roles and a['side']==roles[a['player']]['side']
  if act['type']=='skill' and act['skill'] in ATTACKS and target and target['character'] in COMMANDERS and a['accepted'] and 'attack.kill' in a['receiptKinds']:
   assert act.get('name')==target['character'] and not survivors[target['character']]
   kills.append(dict(victim=target['character'],target=target['id'],attacker=a['player'],at=a['at']))
 assert len({k['victim'] for k in kills})==len(kills)
 ground_kills=[k for k in kills if k['victim'] in GROUND];observed_dead={k['victim'] for k in ground_kills};assert observed_dead<=ground_dead
 complete=observed_dead==ground_dead;first=ground_kills[0] if complete and ground_kills else None
 stages={name:collections.Counter() for name in ['before_first_ground_death','after_first_ground_death','unobserved_ground_death_timing']}
 for a in r['actions']:
  act=a['action'];target=roles.get(act.get('target'))
  if act['type']!='skill' or act['skill'] not in ATTACKS or target is None:continue
  b=stages[phase(a['at'],a['player'],first,positions,complete)];b['namedAttackAttempts']+=1;b['namedAttackAccepted']+=a['accepted']
  enemy=target['side']!=a['side'];role=target['character']
  if enemy and role in COMMANDERS:
   kind='groundCommander' if role in GROUND else 'eltas';b[kind+'Attempts']+=1;b[kind+'Accepted']+=a['accepted'];b[kind+'WrongName']+=act.get('name')!=role
   b[kind+'Failure']+=any(k in ['attack.fail.self','attack.fail','attack.fail.death'] for k in a['receiptKinds']);b[kind+'Kill']+='attack.kill' in a['receiptKinds']
  elif enemy and a['side']==2:b['side2NonCommanderAttempts']+=1
 for q in r.get('supremeDecisions',[]):
  b=stages[phase(q['at'],q['player'],first,positions,complete)];b['activeReportChoices']+=1;b['withSupreme']+=q['skill'] is not None;b['withTrustedReport']+=bool(q['targets'])
  b['eligibleReportChoices']+=q['suggestion'] is not None;b['selectedReports']+=q['selected'];b['idleReplaced']+=q['changed'] and q['originalAction'] is None;b['higherPriorityPreserved']+=q['suggestion'] is not None and not q['selected']
  b['side2ActiveReportChoices']+=q['side']==2
  b['side2WithUnconfirmedGroundCommanderReport']+=q['side']==2 and any(t['name'] in GROUND for t in q['targets'])
  b['groundCommanderSelectedReports']+=q['selected'] and q['chosenAction']['name'] in GROUND
  for t in q['targets']:
   if q['side']==2 and t['name'] in GROUND:b['enemyGroundCommanderReportTarget:'+t['reason']]+=1
 missing_commander_deaths=sorted(c for c in COMMANDERS if not survivors[c] and c not in {k['victim'] for k in kills})
 return dict(variant=x['variant'],fixture=f,winner=g['winner'],elapsedMs=g['elapsedMs'],groundAliveAtEnd=ground_alive,eltasAliveAtEnd=survivors['eltas'],completeGroundDeathTiming=complete,missingGroundDeaths=sorted(ground_dead-observed_dead),missingCommanderDeaths=missing_commander_deaths,firstGroundDeath=first,directCommanderKills=kills,stages=stages)
def analyze(d,verified):
 assert d['complete'] and d['kind']=='identical-report-policy-primordial' and d['executions']==320==len(d['records'])==verified['executions']
 rows=[game_row(x) for x in d['records']];buckets={};keys=set()
 for row in rows:
  f=row['fixture'];key=(row['variant'],f['seed'],f['reversed']);assert key not in keys;keys.add(key)
  for count in [0,f['count']]:
   b=buckets.setdefault((row['variant'],count),dict(counts=collections.Counter(),stages={name:collections.Counter() for name in row['stages']}));c=b['counts'];c['games']+=1;c['winner:'+str(row['winner'])]+=1
   c['groundAliveAtEnd:'+str(len(row['groundAliveAtEnd']))]+=1;c['completeGroundDeathTiming']+=row['completeGroundDeathTiming'];c['unobservedGroundDeathTiming']+=not row['completeGroundDeathTiming'];c['observedFirstGroundDeath']+=row['firstGroundDeath'] is not None
   c['groundWinsBothAlive']+=row['winner']==1 and len(row['groundAliveAtEnd'])==2;c['groundWinsOneAlive']+=row['winner']==1 and len(row['groundAliveAtEnd'])==1
   c['eltasDeadAtEnd']+=not row['eltasAliveAtEnd'];c['eltasDeathOutsideNamedAttackTrace']+='eltas' in row['missingCommanderDeaths']
   for name,counts in row['stages'].items():b['stages'][name].update(counts)
 for variant in d['variants']:
  b=buckets[(variant,0)];v=verified['variants'][variant];assert b['counts']['games']==v['games'] and b['counts']['winner:1']==v['side1Wins'] and b['counts']['winner:2']==v['side2Wins']
  for name,reference in [('activeReportChoices','activeDecisions'),('eligibleReportChoices','eligible'),('selectedReports','selected'),('idleReplaced','idleReplaced')]:
   assert sum(s[name] for s in b['stages'].values())==v['report'].get(reference,0)
 return dict(kind='primordial-commander-stage-analysis',newResearchExecutions=0,replayedGames=0,games=rows,summaries=[dict(variant=k[0],count=k[1],**b) for k,b in sorted(buckets.items())],limitations=['Outcome-conditioned post-hoc descriptive analysis, not causal rule/skill evidence.','Unknown ground-commander death timing excludes all stage attribution for that game.','Same tick uses stored player order; the killers own decision precedes its attack.','Only ON active report choices were collected; OFF has no comparable opportunity census.','Named attacks and received report opportunities do not cover all support/control skills.','Synthetic bots only, human matches zero.'])
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('raw',type=pathlib.Path);p.add_argument('verified',type=pathlib.Path);p.add_argument('out',type=pathlib.Path);a=p.parse_args()
 raw=gzip.decompress(a.raw.read_bytes());d=json.loads(raw);summary_raw=a.verified.read_bytes();verified=json.loads(summary_raw);assert sha(raw)==verified['snapshotSHA256']
 assert sha(pathlib.Path('packages/rules/src/modes/primordial.ts').read_bytes())==d['sourceHashes']['src/modes/primordial.ts']
 result=analyze(d,verified);result.update(sourceSHA256=sha(raw),verifiedSHA256=sha(summary_raw),analysisSHA256=sha(pathlib.Path(__file__).read_bytes()),optionsSHA256=verified['optionsSHA256'],evaluationSourceRef=verified['sourceRef'],ruleSourceSHA256=d['sourceHashes']['src/modes/primordial.ts'])
 out=(json.dumps(result,ensure_ascii=False,indent=2)+'\n').encode();a.out.write_bytes(gzip.compress(out,mtime=0));print(json.dumps({k:v for k,v in result.items() if k!='games'},ensure_ascii=False,indent=2))
