"""Disjoint finite existing-game replays; master order and completed resume are verified."""
import concurrent.futures,datetime,hashlib,json,pathlib,subprocess,sys
sha=lambda b:hashlib.sha256(b).hexdigest();load=lambda p:json.loads(pathlib.Path(p).read_bytes())
root=pathlib.Path(__file__).resolve().parents[1]
def write(path,obj):pathlib.Path(path).write_text(json.dumps(obj,ensure_ascii=False,indent=2)+'\n')
def prepare(manifest,directory,master,frozen,source,workers,deadline):
 manifest=pathlib.Path(manifest).resolve();directory=pathlib.Path(directory).resolve();assert not directory.exists();directory.mkdir()
 selected=load(manifest);n=len(selected['selected']);workers=int(workers);assert 1<=workers<=n
 plan={'kind':'disjoint-existing-replay-plan','manifest':str(manifest),'manifestSHA256':sha(manifest.read_bytes()),'master':master,'frozen':frozen,'sourceRef':source,'deadline':deadline,'batch':8,'workers':[],'orchestrationHashes':{p:sha((root/p).read_bytes()) for p in ['tools/run-selected-replay-parallel.py','tools/merge-selected-replays.mjs']},'newResearchExecutions':0}
 for i in range(workers):
  subset={**selected,'sources':[{**s,'path':str((manifest.parent/s['path']).resolve())} for s in selected['sources']],'selected':selected['selected'][n*i//workers:n*(i+1)//workers]}
  mp=directory/f'worker-{i}-selection.json';write(mp,subset);plan['workers'].append({'index':i,'manifest':str(mp),'manifestSHA256':sha(mp.read_bytes()),'out':str(directory/f'worker-{i}.json'),'expected':len(subset['selected'])})
 write(directory/'plan.json',plan);print(json.dumps({'prepared':n,'workers':workers,'newResearchExecutions':0,'plan':str(directory/'plan.json')}))
def run(plan_path):
 plan_path=pathlib.Path(plan_path);plan=load(plan_path);assert plan['kind']=='disjoint-existing-replay-plan'
 for p,h in plan['orchestrationHashes'].items():assert sha((root/p).read_bytes())==h
 assert sha(pathlib.Path(plan['manifest']).read_bytes())==plan['manifestSHA256'];deadline=datetime.datetime.fromisoformat(plan['deadline'].replace('Z','+00:00'))
 def command(manifest,out,batch):return ['node','--import','./packages/rules/node_modules/tsx/dist/loader.mjs','packages/rules/scripts/failure-commander-death-replay-run.ts',manifest,out,plan['sourceRef'],str(batch),plan['deadline']]
 def verify(manifest,out,complete):
  base=out.removesuffix('.json');subprocess.run(['python','tools/verify-failure-commander-death-replay.py',out,base+'.journal.ndjson',base+'.publication.json',manifest,base+'-summary.json']+([] if complete else ['--partial']),cwd=plan['frozen'],check=True,stdout=subprocess.DEVNULL)
 def resume(manifest,out):
  base=out.removesuffix('.json');paths=[out,base+'.journal.ndjson',base+'.publication.json'];before={p:sha(pathlib.Path(p).read_bytes()) for p in paths}
  result=subprocess.run(command(manifest,out,1),cwd=plan['frozen'],check=True,capture_output=True,text=True);result= json.loads(result.stdout.strip().splitlines()[-1]);assert result['freshReplays']==0 and result['complete']
  assert before=={p:sha(pathlib.Path(p).read_bytes()) for p in paths};proof={'newReplays':0,'newResearchExecutions':0,'unchanged':True,'sha256':before};write(base+'-resume-check.json',proof);return proof
 def worker(w):
  assert sha(pathlib.Path(w['manifest']).read_bytes())==w['manifestSHA256'];fresh=0;log=plan_path.parent/f"worker-{w['index']}.log"
  with log.open('a') as f:
   for _ in range(w['expected']+1):
    if datetime.datetime.now(datetime.timezone.utc)>=deadline:break
    result=subprocess.run(command(w['manifest'],w['out'],plan['batch']),cwd=plan['frozen'],check=True,capture_output=True,text=True);f.write(result.stdout);f.flush();state=json.loads(result.stdout.strip().splitlines()[-1]);fresh+=state['freshReplays'];verify(w['manifest'],w['out'],state['complete'])
    print(json.dumps({'worker':w['index'],'validatedReplays':state['total'],'expected':w['expected'],'complete':state['complete']}),flush=True)
    if state['complete']:break
  data=load(w['out']);proof=resume(w['manifest'],w['out']) if data['complete'] else None
  return {'index':w['index'],'executions':data['executions'],'freshReplaysThisDriver':fresh,'complete':data['complete'],'resume':proof,'newResearchExecutions':0}
 with concurrent.futures.ThreadPoolExecutor(max_workers=len(plan['workers'])) as pool:results=list(pool.map(worker,plan['workers']))
 subprocess.run(['node','--import',str(pathlib.Path(plan['frozen'])/'packages/rules/node_modules/tsx/dist/loader.mjs'),str(root/'tools/merge-selected-replays.mjs'),str(plan_path)],cwd=plan['frozen'],check=True)
 master=load(plan['master']);verify(plan['manifest'],plan['master'],master['complete']);proof=resume(plan['manifest'],plan['master']) if master['complete'] else None
 result={'kind':'disjoint-existing-replay-completion','planSHA256':sha(plan_path.read_bytes()),'complete':master['complete'],'workers':results,'masterExecutions':master['executions'],'masterResume':proof,'newResearchExecutions':0};write(plan_path.parent/'done.json',result);print(json.dumps({'complete':master['complete'],'replayed':master['executions'],'newResearchExecutions':0}),flush=True)
if __name__=='__main__':
 if sys.argv[1]=='prepare':prepare(*sys.argv[2:])
 elif sys.argv[1]=='run':run(sys.argv[2])
 else:raise SystemExit('prepare manifest directory master frozen source workers deadline | run plan.json')
