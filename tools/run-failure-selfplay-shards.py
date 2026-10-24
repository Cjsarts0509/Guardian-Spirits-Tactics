"""Four bounded, disjoint frozen-runner processes; this never implements policy."""
import concurrent.futures,datetime,hashlib,json,pathlib,subprocess,sys,time
directory=pathlib.Path(sys.argv[1]);plan_path=directory/'plan.json';plan=json.loads(plan_path.read_bytes());registration=json.loads((directory/'registration.json').read_bytes())
sha=lambda p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()
assert registration['planSHA256']==sha(plan_path)
deadline=datetime.datetime.fromisoformat(plan['meta']['stopAt'].replace('Z','+00:00'));fixed=plan['frozen'];source=plan['sourceRef']
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=fixed,text=True).strip()==source

def run_worker(worker):
    out=worker['out'];base=out.removesuffix('.json');fresh_total=0;commands=[]
    command=['node','--import','./packages/rules/node_modules/tsx/dist/loader.mjs','packages/rules/scripts/failure-selfplay-run.ts',out,source,str(worker['start']),str(worker['count']),'30',plan['meta']['stopAt']]
    try:
        with open(base+'.execution.log','a') as log:
            for _ in range(1+worker['expected']//30):
                if datetime.datetime.now(datetime.timezone.utc)>=deadline:break
                result=subprocess.run(command,cwd=fixed,capture_output=True,text=True);log.write(result.stdout+result.stderr);log.flush();result.check_returncode()
                progress=json.loads(result.stdout.splitlines()[-1]);fresh_total+=progress['fresh'];commands.append(progress)
                state=json.loads(pathlib.Path(out).read_bytes());verify=['python','tools/verify-failure-selfplay.py',out,base+'.journal.ndjson',base+'.publication.json',base+'-summary.json']+([] if state['complete'] else ['--partial'])
                subprocess.run(verify,cwd=fixed,stdout=log,stderr=log,check=True);log.flush()
                print(json.dumps({'worker':worker['index'],'executions':state['executions'],'copiedPrefix':worker['copiedRecords'],'fresh':fresh_total,'complete':state['complete']}),flush=True)
                if state['complete']:break
            state=json.loads(pathlib.Path(out).read_bytes());assert state['executions']==worker['copiedRecords']+fresh_total
            resume=None
            if state['complete']:
                paths=[out,base+'.journal.ndjson',base+'.publication.json'];before={p:sha(p) for p in paths}
                result=subprocess.run(command,cwd=fixed,capture_output=True,text=True);log.write(result.stdout+result.stderr);result.check_returncode();assert json.loads(result.stdout.splitlines()[-1])['fresh']==0
                assert before=={p:sha(p) for p in paths};resume={'newGames':0,'unchanged':True,'sha256':before}
            answer={'worker':worker['index'],'success':True,'complete':state['complete'],'executions':state['executions'],'copiedRecords':worker['copiedRecords'],'freshGames':fresh_total,'batches':commands,'resume':resume}
    except Exception as e:
        answer={'worker':worker['index'],'success':False,'error':str(e),'freshGamesConfirmed':fresh_total,'batches':commands}
    pathlib.Path(base+'-run-audit.json').write_text(json.dumps(answer,indent=2)+'\n');return answer

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:results=list(pool.map(run_worker,plan['workers']))
(directory/'driver-done.json').write_text(json.dumps({'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'workers':results},indent=2)+'\n')
for _ in range(180):
    if (directory/'merge-done.json').exists():break
    time.sleep(1)
assert (directory/'merge-done.json').exists(),'Coordinator did not finish; preserve all worker stores'
assert all(r['success'] for r in results),results
out=plan['master'];base=out.removesuffix('.json');state=json.loads(pathlib.Path(out).read_bytes());assert state['executions']<=sum(r['executions'] for r in results)
subprocess.run(['python','tools/verify-failure-selfplay.py',out,base+'.journal.ndjson',base+'.publication.json',base+'-summary.json']+([] if state['complete'] else ['--partial']),cwd=fixed,check=True)
if state['complete']:
    assert sum(r['freshGames'] for r in results)+plan['initialMasterCount']==plan['expected']
    paths=[out,base+'.journal.ndjson',base+'.publication.json'];before={p:sha(p) for p in paths}
    result=subprocess.run(['node','--import','./packages/rules/node_modules/tsx/dist/loader.mjs','packages/rules/scripts/failure-selfplay-run.ts',out,source,str(plan['meta']['start']),str(plan['meta']['count']),'96',plan['meta']['stopAt']],cwd=fixed,capture_output=True,text=True);print(result.stdout,flush=True);result.check_returncode();assert json.loads(result.stdout.splitlines()[-1])['fresh']==0
    assert before=={p:sha(p) for p in paths};pathlib.Path(base+'-resume-check.json').write_text(json.dumps({'newGames':0,'unchanged':True,'sha256':before},indent=2)+'\n')
    print(json.dumps({'completedResumeUnchanged':True,'executions':state['executions'],'actualNewShardGames':sum(r['freshGames'] for r in results),'preservedOriginalGames':plan['initialMasterCount']}),flush=True)
else:print(json.dumps({'checkpointedIncomplete':True,'globalPrefix':state['executions'],'allUniqueStagedGames':sum(r['executions'] for r in results)}),flush=True)
