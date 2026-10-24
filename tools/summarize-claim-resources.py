"""Descriptive resource paths after claim intervention; never selects a policy."""
import collections, gzip, hashlib, json, pathlib, sys

path=pathlib.Path(sys.argv[1]);raw=path.read_bytes()
data=json.loads(gzip.decompress(raw) if path.suffix=='.gz' else raw)
assert data['complete'] and data['kind']=='first-false-claim-single-intervention'
score=lambda r:.5 if r['game']['winnerPolicy'] is None else int(r['game']['winnerPolicy']=='current')
groups={}
for row in data['rows']:
    for pair in row['pairs']:
        a,b=pair['control'],pair['truthful'];point=a['point']
        if point is None:continue
        for key in ['overall','mode/'+row['mode'],'cell/'+point['cell']]:
            g=groups.setdefault(key,{'pairs':0,'better':0,'worse':0,'same':0,'scoreDifferenceTotal':0,'incompleteGemAtPoint':0,
                'control':collections.Counter(),'truthful':collections.Counter(),
                'skills':{'control':{},'truthful':{}}})
            g['pairs']+=1;g['better' if score(b)>score(a) else 'worse' if score(b)<score(a) else 'same']+=1
            g['scoreDifferenceTotal']+=score(b)-score(a)
            incomplete=point['before']['gem']<3;g['incompleteGemAtPoint']+=int(incomplete)
            for variant,r in [('control',a['resources']),('truthful',b['resources'])]:
                c=g[variant]
                for k in ['aliveMs','trueNameMs','turns','trueNameTurns','trueNameBonusGross','incomingAllyManaGross',
                          'turnGainGross','acceptedSkillMana','acceptedSkills','rejectedSkills','attackFailures']:
                    c[k]+=r[k]
                c['noPostPointTurn']+=int(not r['turnReceipts'])
                c['firstPostPointTurnTrue']+=int(bool(r['turnReceipts']) and r['turnReceipts'][0]['trueName'])
                c['anyTrueNameTurn']+=int(r['trueNameTurns']>0)
                c['incompleteThenGem3']+=int(incomplete and r['reachedGem3'])
                c['aliveAtEnd']+=int(r['aliveAtEnd'] is True)
                for skill,values in r['skills'].items():
                    dest=g['skills'][variant].setdefault(skill,collections.Counter());dest.update(values)
for g in groups.values():
    assert g['better']+g['worse']+g['same']==g['pairs']
    g['scoreDifferencePerIntervenedPair']=g['scoreDifferenceTotal']/g['pairs']
out={'format':1,'kind':'descriptive-claim-resource-paths','executions':data['executions'],
    'trainingRawSHA256':hashlib.sha256(raw).hexdigest(),
    'analysisSourceSHA256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),
    'promotionEvidence':False,'policySelection':False,
    'limitations':['Totals follow actual diverged game paths; future survival and resources are not held fixed.',
        'Turn gains and true-name bonus are gross before the mana cap, not effective net gain.',
        'Sampled true-name time may include later returns; it is not a guaranteed initial hold duration.',
        'No post hoc feature, threshold or policy selection is performed.'], 'groups':groups}
print(json.dumps(out,ensure_ascii=False,indent=2))
