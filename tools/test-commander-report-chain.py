"""Real corpus join regressions: deletion, altered identity and forged receipt timing."""
import copy,gzip,importlib.util,json,pathlib,sys
p=pathlib.Path(__file__).with_name('commander-report-chain.py');spec=importlib.util.spec_from_file_location('chain',p);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
source,audit=map(pathlib.Path,sys.argv[1:3]);s=json.loads(gzip.decompress(source.read_bytes()));a=json.loads(gzip.decompress(audit.read_bytes()));results=[]
good=module.analyze(s,a)
assert good['counts']['enemyCommanderWhispers']==len(good['messages'])==648
assert len(good['episodes'])==605 and sum(m['firstObservation'] is None for m in good['messages'])==99
results.append(dict(case='all_actual_whispers_and_received_memories_join',passed=True))
for kind in ['deleted_actual_whisper','wrong_report_name','forged_receipt_time','erased_received_history']:
 ss=copy.deepcopy(s);aa=copy.deepcopy(a)
 ref=next(m for m in good['messages'] if m['observedChoices']);k=(ref['variant'],ref['fixture']['seed'],ref['fixture']['reversed'])
 r=next(r for r in ss['records'] if module.key(r['variant'],r['result']['game']['fixture'])==k)
 i=next(i for i,z in enumerate(r['result']['actions']) if z['player']==ref['sender'] and z['at']==ref['at'] and z['action'].get('to')==ref['recipient'])
 if kind=='deleted_actual_whisper':del r['result']['actions'][i]
 elif kind=='wrong_report_name':r['result']['actions'][i]['action']['text']='확인 정보: [1] 라엘';r['result']['actions'][i]['grading']['reportExpectedName']='라엘'
 else:
  r=next(r for r in aa['records'] if module.key(r['variant'],r['fixture'])==k)
  for q in r['decisions']:
   if q['player']!=ref['recipient']:continue
   for t in q['targets']:
    if t['role']!=ref['role']:continue
    if kind=='erased_received_history':t['reports']=[z for z in t['reports'] if not(z['sender']==ref['sender'] and z['at']==ref['at'] and z['target']==ref['target'])]
    else:
     for z in t['reports']:
      if z['sender']==ref['sender'] and z['at']==ref['at'] and z['target']==ref['target']:z['at']+=1
 try:module.analyze(ss,aa)
 except AssertionError:results.append(dict(case=kind,rejected=True))
 else:raise AssertionError('tampering accepted: '+kind)
print(json.dumps(dict(tests=len(results),results=results),indent=2))
