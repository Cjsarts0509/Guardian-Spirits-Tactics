"""Describe own-information constraints before a previously traced commander death.

Case selection is evaluator-only. The choice classifier accepts only the actor's
view, reconstructed own knowledge and chosen action, never actual target identity.
"""
import collections,gzip,hashlib,importlib.util,json,pathlib,sys
PAIR={'consume':('consume_master_guard','eltas'),'kumarin':('kumarin_commander_guard','rael')}
def classify(view,known_pairs,action):
 me=view['me'];assert me['alive'] and view['phase']=='running' and me['character'] in PAIR
 skill_key,name=PAIR[me['character']];role=next(r for r in view['roster'] if r['key']==name)
 assert role['commander'] and role['side']==me['side'];known=dict(known_pairs)
 skill=next((s for s in me['skills'] if s['key']==skill_key),None)
 ready=bool(skill and not skill['passive'] and skill['blocked'] is None and skill['cooldownRemainingMs']==0 and skill['usesLeft']!=0 and me['mana']>=skill['mana'])
 ids=[p['id'] for p in view['players'] if p['id']!=me['id'] and known.get(p['id'])==name];assert len(ids)<=1
 target=next((p for p in view['players'] if p['id'] in ids),None)
 reason='commander_unknown' if target is None else 'commander_dead' if not target['alive'] else 'guard_unavailable' if not ready else 'known_target_invulnerable' if not skill.get('ignoresInvulnerable') and any(x['kind']=='invulnerable' for x in target['statuses']) else 'own_view_guard_proposal'
 proposal={'type':'skill','skill':skill_key,'target':target['id']} if reason=='own_view_guard_proposal' else None
 selected=bool(proposal and action and action.get('type')=='skill' and action.get('skill')==skill_key and action.get('target')==target['id'])
 return {'reason':reason,'ownKnownCommander':ids[0] if ids else None,'guardSkillReady':ready,'proposal':proposal,'selectedProposal':selected,'chosenAction':action,'fullLegalOpportunityProven':False}
def before_boundary(decision,boundary):
 if decision['at']!=boundary['at']:return decision['at']<boundary['at']
 return boundary['kind']=='action' and decision['ordinal']<=boundary['actionIndex']
def analyze(data,cases,originals):
 assert data['complete'] and data['kind']=='own-failure-stalemate-replay'
 rows=[];totals=collections.Counter();seen=set()
 for case in cases:
  matches=[r for r in data['records'] if r['inputId']==case['inputId'] and r['fixture']==case['fixture'] and r['variant']==case['variant']];assert len(matches)==1;row=matches[0]
  key=(row['key'],case['character']);assert key not in seen;seen.add(key)
  original=originals[row['key']];guardian=[p for p in original['roles'] if p['character']==case['guardian']];assert len(guardian)==1;actor=guardian[0]['id']
  selected=[d for d in row['decisions'] if d['actor']==actor and before_boundary(d,case['death']['boundary'])]
  decisions=[];counts=collections.Counter()
  for d in selected:
   assert d['knowledgeScope']=='current-policy-own-update';c=classify(d['view'],d['reconstructedKnownAfter'],d['chosenAction'])
   counts['activeBeforeDeath']+=1;counts[c['reason']]+=1;counts['selectedProposal']+=c['selectedProposal']
   accepted=None
   if c['selectedProposal']:
    a=original['actions'][d['ordinal']];assert a['player']==actor and a['action']==d['chosenAction'];accepted=a['accepted'];counts['acceptedProposal']+=accepted
   # Actual identities are checked only after the own-input classifier has returned.
   known_id=c['ownKnownCommander'];roles={p['id']:p for p in original['roles']}
   if known_id:assert roles[known_id]['character']==case['character']
   decisions.append({'at':d['at'],'ordinal':d['ordinal'],'ownMana':d['view']['me']['mana'],**c,'actualAcceptedIfSelected':accepted})
  assert counts['activeBeforeDeath']==sum(counts[k] for k in ['commander_unknown','commander_dead','guard_unavailable','known_target_invulnerable','own_view_guard_proposal'])
  totals.update(counts);rows.append({'inputId':row['inputId'],'fixture':row['fixture'],'variant':row['variant'],'guardian':case['guardian'],'actor':actor,'commander':case['character'],'death':case['death'],'counts':counts,'decisions':decisions})
 return {'kind':'guardian-own-choices-before-death','caseCount':len(rows),'newResearchExecutions':0,'totals':totals,'cases':rows,'limitations':['Cases selected by death-time nominal readiness; descriptive failure diagnosis, not population performance.','Active calls are repeated observations, not independent games.','An own-view proposal does not certify engine target legality, optimal priority, or an avoided death.','Case role/death identity is grader-only; choice features use own view and recorded own knowledge.','No policy or skill changes.']}
if __name__=='__main__':
 if len(sys.argv)!=7:raise SystemExit('witness journal publication manifest cases-completion output.json')
 witness,journal,publication,manifest_path,cases_path,out=sys.argv[1:]
 p=pathlib.Path(__file__).with_name('verify-failure-stalemate-replay.py');spec=importlib.util.spec_from_file_location('witness',p);v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
 verified=v.verify(witness,journal,publication,manifest_path);data=json.loads(v.read(witness));manifest=json.loads(pathlib.Path(manifest_path).read_bytes());completion=json.loads(pathlib.Path(cases_path).read_bytes());sources={s['id']:json.loads(v.read(pathlib.Path(manifest_path).parent/s['path'])) for s in manifest['sources']};originals={}
 for r,s in zip(data['records'],manifest['selected']):
  matches=[o for o in sources[s['inputId']]['records'] if o['fixture']==s['fixture'] and o['variant']==s['variant'] and o['style']==s['style']];assert len(matches)==1;v.validate(r,matches[0],s);originals[r['key']]=matches[0]
 result=analyze(data,completion['deathTimeNominalReadyCases'],originals);result.update(replayedGames=data['executions'],witnessSHA256=verified['rawSHA256'],casesSHA256=hashlib.sha256(pathlib.Path(cases_path).read_bytes()).hexdigest(),analysisSHA256=hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest())
 pathlib.Path(out).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'caseCount':result['caseCount'],'totals':result['totals'],'newResearchExecutions':0}))
