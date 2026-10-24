"""Use verified070 death paths for descriptive protection denominators, never policy input."""
import gzip,hashlib,importlib.util,json,pathlib,subprocess,sys
def module(name,file):
 spec=importlib.util.spec_from_file_location(name,pathlib.Path(__file__).with_name(file));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
death=module('current_death','verify-failure-commander-death-replay.py')
coverage=module('coverage','protector-coverage-analysis.py')
sha=lambda b:hashlib.sha256(b).hexdigest()
enc=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()
def analyze(raw_path,journal,publication,manifest_path):
 verified=death.verify(raw_path,journal,publication,manifest_path)
 raw=death.read(raw_path);data=json.loads(raw);manifest=json.loads(pathlib.Path(manifest_path).read_bytes())
 results=[];games=[];buckets=[]
 for source in manifest['sources']:
  source_path=pathlib.Path(manifest_path).parent/source['path'];original=json.loads(death.read(source_path))
  assert sha(death.read(source_path))==source['sha256']
  selected=[s for s in manifest['selected'] if s['inputId']==source['id']]
  rows=[r for r in data['records'] if r['inputId']==source['id']];assert len(rows)==len(selected)>0
  originals=[];adapted=[]
  for selection,row in zip(selected,rows):
   matches=[r for r in original['records'] if r['fixture']==selection['fixture'] and r['style']==selection['style'] and r['variant']==selection['variant']];assert len(matches)==1
   o=matches[0];death.validate(row,o,selection)
   adapter={'variant':o['variant'],'roles':o['roles'],'result':{'game':o['game'],'actions':o['actions']}}
   originals.append(adapter);adapted.append({**row,'originalRecordSHA256':sha(enc(adapter)),'policyResultSHA256':sha(enc(adapter))})
  summary=[]
  for key,value in verified['byInputVariantCount'].items():
   input_id,variant,count=key.split('/')
   if input_id==source['id']:summary.append({'variant':variant,'count':int(count),**value})
  n=len(rows);result=coverage.analyze({'complete':True,'executions':n,'records':originals},{'complete':True,'executions':n,'records':adapted},{'uniqueReplayedGames':n,'summary':summary},expected_games=n)
  results.append({'inputId':source['id'],'analyzedGames':n,'originalSHA256':source['sha256'],'sourceRef':original['sourceRef'],'optionsSHA256':original['optionsSHA256']})
  games.extend({'inputId':source['id'],**r} for r in result['games']);buckets.extend({'inputId':source['id'],**r} for r in result['summary'])
 assert sum(r['analyzedGames'] for r in results)==verified['replayedGames']==len(games)
 return {'kind':'current-policy-protector-coverage','complete':True,'analyzedGames':len(games),'newResearchExecutions':0,'newReplayedGames':0,'inputs':results,'summary':buckets,'games':games,'replaySHA256':sha(raw),'journalSHA256':sha(death.read(journal)),'publicationSHA256':sha(death.read(publication)),'manifestSHA256':sha(pathlib.Path(manifest_path).read_bytes()),'limitations':['All registered070 paths; no selection by winner, death or desired role.','Protector absence, death, unavailable skill, nominal readiness and activated protection are separate categories.','Nominal readiness at death is not an earlier legal target-specific opportunity or proof of missed AI action.','Actual named guard absorption and non-named damage are separate; causal balancing interventions were not tested.','No new research matches, humans or policy/skill changes.']}
if __name__=='__main__':
 if len(sys.argv)!=7:raise SystemExit('raw journal publication manifest output.gz frozenAnalysisSource')
 raw,journal,publication,manifest,out,source=sys.argv[1:];assert len(source)==40
 hashes={}
 for name in ['analyze-failure-protector-coverage.py','protector-coverage-analysis.py','verify-failure-commander-death-replay.py','verify-commander-death-replay.py']:
  p=pathlib.Path(__file__).with_name(name);b=p.read_bytes();assert b==subprocess.check_output(['git','show',source+':tools/'+name]);hashes['tools/'+name]=sha(b)
 result=analyze(raw,journal,publication,manifest);result.update(analysisSourceRef=source,analysisFiles=hashes)
 content=(json.dumps(result,ensure_ascii=False,indent=2)+'\n').encode();pathlib.Path(out).write_bytes(gzip.compress(content,mtime=0))
 pathlib.Path(out.removesuffix('.json.gz')+'-summary.json').write_text(json.dumps({k:v for k,v in result.items() if k!='games'},ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({k:v for k,v in result.items() if k not in ['games','summary','limitations']}))
