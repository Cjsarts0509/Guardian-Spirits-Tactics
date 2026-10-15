"""Independently verify single-claim paired data, receipts, source and journal."""
import argparse, collections, gzip, hashlib, json, pathlib, random, subprocess

parser=argparse.ArgumentParser();parser.add_argument('path',type=pathlib.Path);parser.add_argument('--source-ref');parser.add_argument('--journal-path',type=pathlib.Path);parser.add_argument('--allow-partial',action='store_true');args=parser.parse_args()
def read(p):
    b=p.read_bytes();return gzip.decompress(b) if p.suffix=='.gz' else b
d=json.loads(read(args.path));assert d['kind']=='first-false-claim-single-intervention' and d['phase']=='training-diagnostic'
assert d['selectedPublicPlayer']=='p1' and d['count']>0
if not args.allow_partial:assert d['complete'] and len(d['rows'])==12
for group,prefix in [('sourceHashes','packages/rules/'),('auxiliarySourceHashes','')]:
    for path,sha in d[group].items():
        assert '..' not in pathlib.PurePosixPath(path).parts
        source=subprocess.check_output(['git','show',args.source_ref+':'+prefix+path]) if args.source_ref else pathlib.Path(prefix+path).read_bytes()
        assert hashlib.sha256(source).hexdigest()==sha,path
meta={k:v for k,v in d.items() if k not in ['fingerprint','complete','executions','journalSha256','rows']}
assert hashlib.sha256(json.dumps(meta,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()==d['fingerprint']
modes=['civil_war','primordial','lidellut','troll'];styles=['truthful','bluff','skill-aware-bluff'];seen=set();game_records={};executions=0
out={'format':1,'complete':d['complete'],'start':d['start'],'seeds':d['count'],'executions':0,'pairs':0,'intervenedPairs':0,'nonIntervenedEqualPairs':0,'modes':{},'sourceHashes':d['sourceHashes'],'auxiliarySourceHashes':d['auxiliarySourceHashes'],'promotionEvidence':False}
all_differences=collections.defaultdict(list)
for row in d['rows']:
    mode,style=row['mode'],row['style'];assert mode in modes and style in styles and (mode,style) not in seen;seen.add((mode,style))
    if not args.allow_partial:assert len(row['pairs'])==d['count']*4
    bucket=out['modes'].setdefault(mode,{'pairs':0,'intervened':0,'nonIntervenedEqual':0,'controlScore':0,'truthfulScore':0,'unfinished':{'control':0,'truthful':0},'earlyAttackFailures':{'control':0,'truthful':0},'rejected':{'control':0,'truthful':0},'safety':{'control':collections.Counter(),'truthful':collections.Counter()},'resourceDelta':collections.Counter()})
    fixtures=set()
    for pair in row['pairs']:
        f=pair['fixture'];assert f['mode']==mode and d['start']<=f['seed']<d['start']+d['count'] and f['count']==8+(f['seed']-d['start'])%5
        key=(f['seed'],f['reversed'],f['currentSide']);assert key not in fixtures;fixtures.add(key)
        assert type(f['reversed']) is bool and f['currentSide'] in [1,2]
        if args.allow_partial and ('control' not in pair or 'truthful' not in pair):continue
        a,b=pair['control'],pair['truthful'];points=[];scores=[]
        for variant,result in [('control',a),('truthful',b)]:
            g,p,r=result['game'],result['point'],result['resources'];assert g['fixture']==f
            assert g['winnerPolicy']==(None if g['winner'] is None else 'current' if g['winner']==f['currentSide'] else 'reference')
            score=.5 if g['winnerPolicy'] is None else float(g['winnerPolicy']=='current');scores.append(score)
            assert 0<=g['elapsedMs']<=d['settings']['limitMs'] and g['stats']['current']['attempted']==g['stats']['current']['accepted']+g['stats']['current']['rejected']
            bucket[variant+'Score']+=score;bucket['unfinished'][variant]+=int(g['winner'] is None);bucket['earlyAttackFailures'][variant]+=g['stats']['current']['earlyAttackFailures'];bucket['rejected'][variant]+=g['stats']['current']['rejected'];bucket['safety'][variant].update(result['safety'])
            assert result['forcedChanges']==int(variant=='truthful' and p is not None)
            assert r['trueNameBonusGross']==10*r['trueNameTurns'] and r['turnGainGross']==20*r['turns']+r['incomingAllyManaGross']+r['trueNameBonusGross']
            assert r['turns']==len(r['turnReceipts']) and r['trueNameTurns']==sum(x['trueName'] for x in r['turnReceipts'])
            assert r['incomingAllyManaGross']==10*sum(x['allies'] for x in r['turnReceipts'])
            assert r['turnGainGross']==sum(x['gain'] for x in r['turnReceipts'])
            assert r['acceptedSkillMana']==sum(x['nominalMana'] for x in r['skills'].values()) and r['acceptedSkills']==sum(x['accepted'] for x in r['skills'].values()) and r['rejectedSkills']==sum(x['rejected'] for x in r['skills'].values())
            assert 0<=r['trueNameMs']<=r['aliveMs']<=g['elapsedMs']+d['settings']['tickMs']
            if p:
                assert p['player']=='p1' and 0<=p['at']<=g['elapsedMs'] and p['before']['side']==f['currentSide'] and not p['before']['hasDisguise']
                assert p['accepted'] is True and p['error'] is None
                assert p['cell']=='C%dG%dT%d'%(int(p['before']['commander']),int(p['before']['gem']<3),int(p['before']['nextTurnInMs']<=43000))
                assert p['original']['type']=='skill' and p['original']['skill']=='publish' and p['original']['name']!=p['before']['character']
                assert p['truthful']=={**p['original'],'name':p['before']['character']} and p['executed']==p['truthful' if variant=='truthful' else 'original']
                for receipt in r['turnReceipts']:assert p['at']<=receipt['at']<=g['elapsedMs'] and receipt['gain']==20+10*receipt['allies']+10*receipt['trueName'] and receipt['gem'] in [0,1,2,3]
            else:assert r['turns']==r['aliveMs']==0
            points.append(p);game_records[(mode,style,*key,variant)]=result;executions+=1
        assert bool(points[0])==bool(points[1]);bucket['pairs']+=1;out['pairs']+=1
        all_differences[f['seed']].append(scores[1]-scores[0])
        if points[0]:
            for k in ['at','player','cell','stateHash','memoryHash','viewHash','before','original','truthful']:assert points[0][k]==points[1][k]
            out['intervenedPairs']+=1;bucket['intervened']+=1
            for k in ['aliveMs','trueNameMs','turns','trueNameTurns','trueNameBonusGross','incomingAllyManaGross','turnGainGross','acceptedSkillMana','acceptedSkills','rejectedSkills','attackFailures']:
                bucket['resourceDelta'][k]+=b['resources'][k]-a['resources'][k]
        else:assert a==b;out['nonIntervenedEqualPairs']+=1;bucket['nonIntervenedEqual']+=1
for bucket in out['modes'].values():
    bucket['controlScore']/=bucket['pairs'];bucket['truthfulScore']/=bucket['pairs']
out['executions']=executions;assert executions==d['executions']
if not args.allow_partial:assert executions==d['count']*4*3*4*2
values=[sum(v)/len(v) for _,v in sorted(all_differences.items())];out['difference']=sum(values)/len(values)
rng=random.Random(0x475354);means=sorted(sum(rng.choices(values,k=len(values)))/len(values) for _ in range(10000));out['seedBootstrap95']=[means[250],means[9749]]
if args.journal_path:
    raw=read(args.journal_path);assert hashlib.sha256(raw).hexdigest()==d['journalSha256'];lines=raw.splitlines();header=json.loads(lines.pop(0));assert header['fingerprint']==d['fingerprint'] and header['meta']==meta
    journal_records={}
    for line in lines:
        x=json.loads(line);f=x['result']['game']['fixture'];key=(x['mode'],x['style'],f['seed'],f['reversed'],f['currentSide'],x['variant']);assert key not in journal_records;journal_records[key]=x['result']
    assert journal_records==game_records;out['journalVerified']=True
if d.get('persistence')=={'version':2}:
    assert args.journal_path,'v2 verification requires journal'
    base=str(args.path).removesuffix('.gz').removesuffix('.json')
    publication=json.loads(pathlib.Path(base+'.publication.json').read_text())
    assert publication=={'version':2,'fingerprint':d['fingerprint'],'executions':d['executions'],'complete':d['complete'],'snapshotSHA256':hashlib.sha256(read(args.path)).hexdigest(),'journalSHA256':hashlib.sha256(read(args.journal_path)).hexdigest()}
    out['publicationVerified']=True
print(json.dumps(out,ensure_ascii=False,indent=2))
