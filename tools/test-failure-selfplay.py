"""Mutation checks for externally scored same-policy records, not new matches."""
import copy,importlib.util,json,pathlib,sys
spec=importlib.util.spec_from_file_location('selfplay_audit',pathlib.Path(__file__).with_name('verify-failure-selfplay.py'))
v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
data=json.loads(v.read(sys.argv[1]));records=data['records']
for row in records:v.validate_row(row)
base=next(r for r in records if r['actions'])
mutations=[
 ('opponent-style',lambda r:r.update(style='bluff')),
 ('duplicate-controller-side',lambda r:r['fixture'].update(currentSide=2)),
 ('side1-mana',lambda r:r['resourcesBySide']['1'].update(nominalSkillMana=r['resourcesBySide']['1']['nominalSkillMana']+1)),
 ('side2-mana',lambda r:r['resourcesBySide']['2'].update(nominalSkillMana=r['resourcesBySide']['2']['nominalSkillMana']+1)),
 ('side2-reports',lambda r:r['resourcesBySide']['2'].update(reports=r['resourcesBySide']['2']['reports']+1)),
 ('invalid-winner',lambda r:r['game'].update(winner=3)),
 ('missing-player',lambda r:r['roles'].pop()),
 ('wrong-actor-role',lambda r:r['actions'][0].update(character='invalid-role')),
 ('unrecorded-rejection',lambda r:r['actions'][0].update(accepted=not r['actions'][0]['accepted'])),
 ('side1-resource-projection',lambda r:r['resources'].update(rejected=r['resources']['rejected']+1)),
]
rejected=[]
for label,mutate in mutations:
 row=copy.deepcopy(base);mutate(row)
 try:v.validate_row(row)
 except (AssertionError,KeyError,IndexError,TypeError):rejected.append(label)
 else:raise AssertionError('accepted invalid record: '+label)
probed=next((r for r in records if r['probes']),None)
if probed:
 row=copy.deepcopy(probed);row['probes'][0]['view']['players'][0]['character']='secret'
 try:v.validate_row(row)
 except AssertionError:rejected.append('hidden-role-in-own-view')
 else:raise AssertionError('accepted hidden role')
print(json.dumps({'validRecords':len(records),'rejected':rejected,'positiveFailureRecordAvailable':probed is not None,'newMatches':0}))
