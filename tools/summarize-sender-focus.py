"""Descriptive, post-052 diagnostic only; external IDs never enter a policy."""
import importlib.util,json,pathlib,sys
spec=importlib.util.spec_from_file_location('v',pathlib.Path(__file__).with_name('verify-incoming-sender-witness.py'));v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
if len(sys.argv)!=4:raise SystemExit('witness052 original045 output-json')
blob=v.read(sys.argv[1]);assert v.sha(blob)=='30ae179caf1d661d94242b7d4b1ce4e3ed0d1ee22dc2237f96c7b1c41f1a66ae';w=json.loads(blob);o=json.loads(v.read(sys.argv[2]));rows=[]
for r in w['records']:
 original=next(x for x in o['records'] if x['variant']==r['variant'] and x['result']['game']['fixture']==r['fixture']);v.validate_row(r,original);ids={p['character']:p['id'] for p in original['roles']}
 if r['fixture']['seed']!=151009:continue
 for d in r['decisions']:
  if d['player']!=ids['drakan']:continue
  sender=next((s for s in d['diagnostic']['senders'] if s['id']==ids['kilder']),None)
  if not sender or not any(p['target']==ids['eltas'] for p in sender['reports']):continue
  diag=d['diagnostic'];checks=[c for c in diag['checks'] if c['action']['target']==ids['kilder']];gems=[c for c in diag['gemCandidates'] if c['target']==ids['kilder']];feasible=bool(checks or gems)
  matched=d['alternative'] is not None and d['alternative'].get('target')==ids['kilder']
  rows.append(dict(variant=r['variant'],at=d['at'],beforeAppliedActions=d['beforeAppliedActions'],mana=d['view']['me']['mana'],reserve=diag['reserve'],senderKnown=sender['known'],eligibleSender=ids['kilder'] in diag['incoming'],checks=checks,gemCandidates=gems,feasible=feasible,alternativeTargetsThisSender=matched,chosenAction=d['chosenAction'],alternative=d['alternative'],diagnosticProposal=diag['proposal']))
result=dict(kind='round052-posthoc-focus',sourceSHA256=v.sha(pathlib.Path(__file__).read_bytes()),witnessSHA256=v.sha(blob),newResearchExecutions=0,rows=rows,
 counts=dict(reportObservedChoices=len(rows),feasibleSenderConfirmationChoices=sum(r['feasible'] for r in rows),alternativeTargetsSender=sum(r['alternativeTargetsThisSender'] for r in rows)),
 limitations=['Descriptive two-policy copies of one situation, not independent errors or performance evidence.','Feasible named-sender confirmation does not establish that it should outrank combat or growth.'])
pathlib.Path(sys.argv[3]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps(result['counts']))
