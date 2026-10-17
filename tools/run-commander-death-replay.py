"""Bounded round047 replay coordinator, resumable from canonical CooperativeStore."""
import datetime,hashlib,json,pathlib,subprocess,sys
root=pathlib.Path(__file__).resolve().parents[1]
if len(sys.argv)!=3:raise SystemExit('frozenSourceSHA /tmp/output.json')
source,out=sys.argv[1:];out=pathlib.Path(out);logroot=out.parent/(out.stem+'-logs');logroot.mkdir(exist_ok=True)
raw=root/'docs/evaluations/cooperation-round-045-selfplay.json.gz'
def run(cmd,log):
 r=subprocess.run(cmd,cwd=root,capture_output=True,text=True);log.write_text(r.stdout+r.stderr)
 if r.returncode:raise RuntimeError(f'{log}: command failed {r.returncode}')
for attempt in range(9):
 active=json.loads((root/'docs/ai-rounds/ACTIVE.json').read_text());assert active['round']==47 and active['status']=='in_progress' and active['owner']=='round047-engine-commander-deaths'
 assert datetime.datetime.now(datetime.timezone.utc)<datetime.datetime.fromisoformat(active['leaseUntil'])
 current=json.loads(out.read_text()) if out.exists() else None
 if current and current['complete']:break
 before=current['executions'] if current else 0
 cmd=['node','--import','./packages/rules/node_modules/tsx/dist/loader.mjs','packages/rules/scripts/commander-death-replay-run.ts',str(raw),str(out),source,'40']
 start=datetime.datetime.now(datetime.timezone.utc).isoformat();run(cmd,logroot/f'batch-{before:03}.log')
 run(['python','tools/verify-commander-death-replay.py',str(out),str(raw),str(out.with_suffix('.journal.ndjson')),str(out.with_suffix('.publication.json')),str(out.with_suffix('.verified.json'))],logroot/f'verify-{before:03}.log')
 after=json.loads(out.read_text());assert before<after['executions']<=before+40
 row={'before':before,'after':after['executions'],'newUniqueGames':after['executions']-before,'policyReplayPasses':after['executions']-before,'commandReplayPasses':after['executions']-before,'startedUTC':start,'finishedUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'command':cmd,'verified':True}
 with out.with_suffix('.batches.ndjson').open('a') as f:f.write(json.dumps(row)+'\n')
 print(json.dumps(row),flush=True)
else:raise RuntimeError('finite batch budget exhausted')
assert json.loads(out.read_text())['complete']
