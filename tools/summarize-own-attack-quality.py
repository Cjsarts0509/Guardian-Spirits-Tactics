"""Describe verified own-attack evidence and subsequent actions independently from the score gate."""
import argparse,collections,gzip,hashlib,json,pathlib
p=argparse.ArgumentParser();p.add_argument('raw',type=pathlib.Path);p.add_argument('verified',type=pathlib.Path);p.add_argument('out',type=pathlib.Path);a=p.parse_args()
b=a.raw.read_bytes();d=json.loads(gzip.decompress(b) if a.raw.suffix=='.gz' else b);v=json.loads(a.verified.read_bytes())
assert d['complete'] and v['complete'] and d['fingerprint']==v['fingerprint'] and d['variants'][-1]=='learnOwnAttackOutcome'
totals=collections.Counter();modes={};episodes=[]
for r in d['records']:
 if r['variant']!='learnOwnAttackOutcome':continue
 x=r['result'];mode=r['mode'];count=modes.setdefault(mode,collections.Counter());proofs={(t['player'],t['proof']['seq']):t for t in x['ownAttackProofs']}
 for t in x['outcomeOpportunities']:
  count['successfulNamedOutcomes']+=1
  if t['knownBefore']:continue
  count['unknownBeforeSuccesses']+=1
  if not(t['gameRunning'] and t['actorAlive'] and t['targetAlive']):count['endedOrDeadTargetExcluded']+=1;continue
  count['eligibleUnknownSuccesses']+=1;proof=proofs.get((t['player'],t['seq']))
  if not proof:count['missingMemory']+=1;continue
  count['remembered']+=1;count['wrongMemory']+=int(not proof['correct']);k=proof['proof']
  follow=[act for act in x['actions'] if act['player']==t['player'] and act['accepted'] and ((act['at']>k['at'] and act['action'].get('target')==k['target']) or (act['at']>=k['at'] and act['action'].get('type')=='chat' and act['action'].get('text')==f"확인 정보: [{proof['targetSeat']}] {proof['nameLabel']}"))]
  attack=any(act['action'].get('skill') in ['attack','advanced_attack','supreme_attack','soen_chain_murder'] and act['action'].get('name')==k['name'] for act in follow)
  report=any(act['action']['type']=='chat' for act in follow)
  check=any(act['action'].get('skill') in ['truth_gem','ally_check','enemy_check','advanced_ally_check','advanced_enemy_check','scan','advanced_scan','troll_scan','troll_ally_scan','troll_enemy_scan'] for act in follow)
  count['episodesWithLaterNamedAttack']+=int(attack);count['episodesWithLaterReport']+=int(report);count['episodesWithLaterCheck']+=int(check)
  episodes.append({'fixture':x['game']['fixture'],'style':r['style'],'player':t['player'],'target':t['target'],'name':t['name'],'at':t['at'],'seq':t['seq'],'kind':t['kind'],'laterNamedAttack':attack,'laterReport':report,'laterCheck':check})
 count['allProofs']+=len(proofs);count['allWrongProofs']+=sum(not t['correct'] for t in proofs.values())
for c in modes.values():totals.update(c)
functional=totals['eligibleUnknownSuccesses']>0 and totals['remembered']==totals['eligibleUnknownSuccesses'] and totals['allWrongProofs']==0
out={'kind':'own-attack-behavior-quality','newResearchExecutions':0,'executions':d['executions'],'fingerprint':d['fingerprint'],'functionalGatePassed':functional,'totals':dict(totals),'byMode':modes,'episodes':episodes,'legacyScoreGateDiagnosticOnly':v['developmentGatePassed'],'contrasts':v['contrasts'],'deploymentApproved':False,'limitations':['Follow-up is an observed association, not an isolated causal win contribution.','Successful killing/finished games are reported separately from living-target memory opportunities.','Synthetic bots only; no human-match evidence.'],'rawSHA256':hashlib.sha256(b).hexdigest(),'verifiedSHA256':hashlib.sha256(a.verified.read_bytes()).hexdigest()}
a.out.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:out[k] for k in ['functionalGatePassed','totals','legacyScoreGateDiagnosticOnly']},ensure_ascii=False))
