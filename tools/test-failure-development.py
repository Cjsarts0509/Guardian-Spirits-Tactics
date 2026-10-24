"""Meaningful verifier corruption regressions on recorded actual engine failure scenes."""
import importlib.util,pathlib,json,copy,sys
spec=importlib.util.spec_from_file_location('verify',pathlib.Path(__file__).with_name('verify-failure-development.py'));v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
d=json.loads(v.read(sys.argv[1]));records=d['records'];source=next(r for r in records if r['probes'] and r['probes'][0]['evidence'] and r['followups'])
for r in records:v.validate(r)
first=lambda r:r['probes'][0]
evidence=lambda r:first(r)['evidence'][0]
changes=[lambda r:r['actions'][0].update(side=3),lambda r:r['resources'].update(rejected=-1),
 lambda r:r['counters'].update(firstFailures=-1),lambda r:evidence(r).update(eligible=not evidence(r)['eligible']),
 lambda r:evidence(r).update(target='wrong'),lambda r:first(r).update(changed=not first(r)['changed']),
 lambda r:first(r)['view']['players'][0].update(character='hidden'),lambda r:r['episodes'][0]['receipt'].update(at=-1),
 lambda r:first(r).update(onRng=-1),lambda r:r.update(memoryTraceSHA256='bad'),
 lambda r:r['followups'][0].update(ordinal=-1),lambda r:r['followups'][0].update(target='wrong')]
for change in changes:
 bad=copy.deepcopy(source);change(bad)
 try:v.validate(bad)
 except (AssertionError,KeyError):continue
 raise AssertionError('tampered witness accepted')
print(json.dumps({'validatedRecords':len(records),'tamperRejected':len(changes),'newResearchExecutions':0}))
