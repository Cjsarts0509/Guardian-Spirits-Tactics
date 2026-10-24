"""Own-memory report observations, distinct from network receipt and trusted facts."""
import collections,hashlib,importlib.util,json,pathlib,sys
def module(name,file):
 spec=importlib.util.spec_from_file_location(name,pathlib.Path(__file__).with_name(file));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
choices=module('choices','analyze-guardian-own-choices.py');v=module('witness','verify-failure-stalemate-replay.py')
def census(decisions,actions,actor,commander):
 reports={};ordered=[]
 for d in decisions:
  assert d['actor']==actor and d['knowledgeScope']=='current-policy-own-update';known=dict(d['reconstructedKnownAfter']);own=d['view']['me'];roster={r['key']:r for r in d['view']['roster']}
  memory=v.memory(d['postMemory'],actor);intel=memory['perception'].get('intel') or {};stored=intel.get('reports',{'$gstMap':[]})
  for target,senders in stored['$gstMap']:
   for sender,r in senders['$gstMap']:
    if r['character']!=commander:continue
    key=(target,sender,r['seq'])
    if key in reports:continue
    matching=[(i,a) for i,a in enumerate(actions) if a['accepted'] and a['player']==sender and a['at']==r['at'] and a['reportTarget']==target and a['reportedName']==r['character']]
    assert len(matching)==1;ordinal,command=matching[0];sender_known=known.get(sender)
    item={'target':target,'sender':sender,'seq':r['seq'],'reportAt':r['at'],'firstOwnPrimaryObservationAt':d['at'],'observationDelayMs':d['at']-r['at'],'senderKnownAtObservation':sender_known,'senderKnownSameSide':sender_known is not None and roster[sender_known]['side']==own['side'],'targetKnownAtObservation':known.get(target),'sourceActionOrdinal':ordinal,'sourceAction':command['action'],'trustNotEvaluated':True}
    assert item['observationDelayMs']>=0;reports[key]=item;ordered.append(item)
 for report in ordered:
  later=[d for d in decisions if d['at']>=report['firstOwnPrimaryObservationAt']]
  confirmations=[d for d in later if dict(d['reconstructedKnownAfter']).get(report['target'])==commander]
  report['laterOwnKnownCommander']=bool(confirmations);report['firstKnownAt']=confirmations[0]['at'] if confirmations else None
 counts=collections.Counter({'ownPrimaryCalls':len(decisions),'uniqueObservedStoredCommanderReports':len(ordered),'senderUnknownAtFirstObservation':sum(r['senderKnownAtObservation'] is None for r in ordered),'senderKnownSameSideAtFirstObservation':sum(r['senderKnownSameSide'] for r in ordered),'targetAlreadyKnownAtFirstObservation':sum(r['targetKnownAtObservation']==commander for r in ordered),'laterOwnKnownCommander':sum(r['laterOwnKnownCommander'] for r in ordered)})
 return {'counts':counts,'reports':ordered}
def analyze(data,case_analysis,originals):
 results=[];totals=collections.Counter()
 for case in case_analysis['cases']:
  found=[r for r in data['records'] if r['inputId']==case['inputId'] and r['fixture']==case['fixture'] and r['variant']==case['variant']];assert len(found)==1;row=found[0];original=originals[row['key']]
  selected=[d for d in row['decisions'] if d['actor']==case['actor'] and choices.before_boundary(d,case['death']['boundary'])];assert len(selected)==case['counts'].get('activeBeforeDeath',0)
  result=census(selected,original['actions'],case['actor'],case['commander']);totals.update(result['counts']);totals['cases']+=1;totals['casesWithoutObservedStoredReport']+=not result['reports']
  results.append({k:case[k] for k in ['inputId','fixture','variant','actor','guardian','commander','death']}|result)
 assert len(results)==case_analysis['caseCount'];return {'kind':'guardian-own-memory-commander-report-census','newResearchExecutions':0,'newReplayedGames':0,'cases':results,'totals':totals,'limitations':['Stored reports are sampled at actual primary decisions before the traced death.','No observed stored report does not prove no delivered event between samples or no earlier expired report.','Sender-known-same-side is not the complete trustedIntel eligibility test; trust is not asserted.','A report remains a report; later independent knowledge is only a temporal association.','Case selection is death-time nominal readiness, not population communication or win-rate sampling.']}
if __name__=='__main__':
 if len(sys.argv)!=7:raise SystemExit('witness journal publication manifest choices output.json')
 witness,journal,publication,manifest_path,case_path,out=sys.argv[1:];verified=v.verify(witness,journal,publication,manifest_path);data=json.loads(v.read(witness));manifest=json.loads(pathlib.Path(manifest_path).read_bytes());cases=json.loads(v.read(case_path));assert cases['witnessSHA256']==verified['rawSHA256'];sources={s['id']:json.loads(v.read(pathlib.Path(manifest_path).parent/s['path'])) for s in manifest['sources']};originals={}
 for row,selected in zip(data['records'],manifest['selected']):
  found=[r for r in sources[selected['inputId']]['records'] if r['fixture']==selected['fixture'] and r['style']==selected['style'] and r['variant']==selected['variant']];assert len(found)==1;v.validate(row,found[0],selected);originals[row['key']]=found[0]
 result=analyze(data,cases,originals);result.update(witnessSHA256=verified['rawSHA256'],choicesSHA256=hashlib.sha256(v.read(case_path)).hexdigest(),analysisSHA256=hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest());pathlib.Path(out).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'totals':result['totals'],'newResearchExecutions':0}))
