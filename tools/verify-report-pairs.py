"""Independent own receipt, intervention, fixture, full source and journal checks."""
import argparse,collections,gzip,hashlib,json,pathlib,random,subprocess
p=argparse.ArgumentParser();p.add_argument('path',type=pathlib.Path);p.add_argument('--source-ref');p.add_argument('--journal-path',type=pathlib.Path);p.add_argument('--allow-partial',action='store_true');a=p.parse_args()
def read(p):
    b=p.read_bytes();return gzip.decompress(b) if p.suffix=='.gz' else b
d=json.loads(read(a.path));assert d['kind']=='first-trusted-report-single-normal' and d['phase']=='training-diagnostic' and d['selectedPublicPlayer']=='p1'
assert d['count']>0 and d['learning']=={'groups':1,'minPairs':64,'minSeeds':16,'bootstrapSamples':10000,'bootstrapSeed':0x475354,'selection':'seed99LowerPositive'}
files=subprocess.check_output(['git','ls-tree','-r','--name-only',a.source_ref,'packages/rules/src'],text=True).splitlines() if a.source_ref else [str(x) for x in pathlib.Path('packages/rules/src').rglob('*.ts')]
expected={x.removeprefix('packages/rules/') for x in files if x.endswith('.ts')}|{'scripts/'+x for x in ['cooperative-report-pairs.ts','cooperative-report-intervention.ts','cooperative-claim-intervention.ts','league-runner.ts','baselines/pre-cooperative.ts','claim-opponents.ts']}
if d.get('persistence')=={'version':2}:expected.add('scripts/cooperative-store.ts')
assert set(d['sourceHashes'])==expected and set(d['auxiliarySourceHashes'])=={'tools/verify-report-pairs.py'}
for group,prefix in [('sourceHashes','packages/rules/'),('auxiliarySourceHashes','')]:
    for path,sha in d[group].items():
        assert '..' not in pathlib.PurePosixPath(path).parts
        raw=subprocess.check_output(['git','show',a.source_ref+':'+prefix+path]) if a.source_ref else pathlib.Path(prefix+path).read_bytes();assert hashlib.sha256(raw).hexdigest()==sha,path
meta={k:v for k,v in d.items() if k not in ['fingerprint','complete','executions','journalSha256','rows']}
assert hashlib.sha256(json.dumps(meta,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()==d['fingerprint']
out={'format':1,'complete':d['complete'],'start':d['start'],'seeds':d['count'],'executions':0,'pairs':0,'intervenedPairs':0,'nonIntervenedEqualPairs':0,'modes':{},'promotionEvidence':False,'sourceHashes':d['sourceHashes'],'auxiliarySourceHashes':d['auxiliarySourceHashes']}
seen=set();records={};diffs=collections.defaultdict(list);changes=collections.Counter();intervened_diffs=collections.defaultdict(list);safe=True;alternatives=collections.Counter()
for row in d['rows']:
    mode,style=row['mode'],row['style'];assert mode in ['civil_war','primordial','lidellut','troll'] and style in ['truthful','bluff','skill-aware-bluff'] and (mode,style) not in seen;seen.add((mode,style));fs=set()
    b=out['modes'].setdefault(mode,{'pairs':0,'intervened':0,'controlScore':0,'normalScore':0,'unfinished':collections.Counter(),'earlyAttackFailures':collections.Counter(),'rejected':collections.Counter(),'safety':{'control':collections.Counter(),'normal':collections.Counter()},'resources':{'control':collections.Counter(),'normal':collections.Counter()},'laterSameCheck':0,'laterSameCheckDelayMs':0,'laterSameCheckNever':0,'originalCheckRejected':0})
    for pair in row['pairs']:
        f=pair['fixture'];key=(f['seed'],f['reversed'],f['currentSide']);assert f['mode']==mode and d['start']<=f['seed']<d['start']+d['count'] and f['count']==8+(f['seed']-d['start'])%5
        assert key not in fs and type(f['reversed']) is bool and f['currentSide'] in [1,2];fs.add(key)
        if a.allow_partial and ('control' not in pair or 'normal' not in pair):continue
        scores=[];points=[]
        for v in ['control','normal']:
            r=pair[v];g,point,res=r['game'],r['point'],r['resources'];assert g['fixture']==f
            assert g['winnerPolicy']==(None if g['winner'] is None else 'current' if g['winner']==f['currentSide'] else 'reference')
            score=.5 if g['winnerPolicy'] is None else float(g['winnerPolicy']=='current');scores.append(score);points.append(point)
            safe &= not sum(r['safety'].values()) and g['stats']['current']['earlyAttackFailures']==0
            for z in g['stats'].values():assert z['attempted']==z['accepted']+z['rejected']
            assert 0<=g['elapsedMs']<=d['settings']['limitMs'] and r['forcedChanges']==int(v=='normal' and point is not None)
            b[v+'Score']+=score;b['unfinished'][v]+=g['winner'] is None;b['earlyAttackFailures'][v]+=g['stats']['current']['earlyAttackFailures'];b['rejected'][v]+=g['stats']['current']['rejected'];b['safety'][v].update(r['safety'])
            skills={};last=-1;ally_net=pub_net=failures=0;same_checks=[]
            for t in r['actions']:
                assert point and point['at']<=t['at']<=g['elapsedMs'] and last<=t['at'] and min(t['beforeMana'],t['afterMana'],t['nominalMana'])>=0;last=t['at']
                assert t['accepted']==(t['error'] is None);act=t['action'];failures+=t['attackFailure']
                assert t['beforeGem'] in [0,1,2,3] and t['afterGem'] in [0,1,2,3]
                if act['type']=='skill' and act['skill']=='truth_gem' and t['accepted']:assert t['beforeGem'] in [2,3] and t['afterGem']==(0 if t['beforeGem']==2 else 3)
                if act['type']=='skill':
                    z=skills.setdefault(act['skill'],collections.Counter())
                    if t['accepted']:
                        z['accepted']+=1;z['nominalMana']+=t['nominalMana'];z['netManaDelta']+=t['afterMana']-t['beforeMana']
                        if act['skill']=='ally':
                            assert t['nominalMana']==10 and t['afterMana']==t['beforeMana']-10;ally_net+=10
                        if act['skill']==point['original']['skill'] and act.get('target')==point['original']['target']:same_checks.append(t['at'])
                        if act['skill']=='publish':assert t['afterMana']-t['beforeMana']==min(t['maxMana'],t['beforeMana']+5)-t['beforeMana'];pub_net+=t['afterMana']-t['beforeMana']
                    else:z['rejected']+=1
            for k,z in res['skills'].items():assert z=={n:skills[k][n] for n in ['accepted','rejected','nominalMana','netManaDelta']}
            assert set(skills)==set(res['skills']) and res['acceptedSkillMana']==sum(z['nominalMana'] for z in skills.values()) and res['acceptedSkills']==sum(z['accepted'] for z in skills.values()) and res['rejectedSkills']==sum(z['rejected'] for z in skills.values())
            assert res['allyManaNet']==ally_net and res['publishManaNet']==pub_net and res['attackFailures']==failures
            assert res['firstSameCheckAt']==(min(same_checks) if same_checks else None) and res['firstSameCheckDelayMs']==(min(same_checks)-point['at'] if same_checks else None)
            receipts=res['turnReceipts'];assert res['turns']==len(receipts) and res['trueNameTurns']==sum(t['trueName'] for t in receipts) and res['trueNameBonusGross']==10*res['trueNameTurns']
            assert res['incomingAllyManaGross']==10*sum(t['allies'] for t in receipts) and res['turnGainGross']==sum(t['gain'] for t in receipts)==20*res['turns']+res['incomingAllyManaGross']+res['trueNameBonusGross']
            for t in receipts:assert point and point['at']<=t['at']<=g['elapsedMs'] and t['gain']==20+10*t['allies']+10*t['trueName'] and t['gem'] in [0,1,2,3]
            assert 0<=res['trueNameMs']<=res['aliveMs']<=g['elapsedMs']+d['settings']['tickMs']
            fact_receipts=res['reportedFactReceipts'];assert res['firstExactReportedFactAt']==(min(x['at'] for x in fact_receipts) if fact_receipts else None)
            assert len({x['seq'] for x in fact_receipts})==len(fact_receipts)
            for x in fact_receipts:assert point and point['at']<=x['at']<=g['elapsedMs'] and x['player']==point['original']['target'] and x['character']==point['before']['targetName'] and not x['kind'].startswith('chat.')
            if point:
                x=point['before'];assert point['player']=='p1' and 0<=point['at']<=g['elapsedMs'] and x['side']==f['currentSide']
                assert x['targetAlive'] and not x['targetKnown'] and point['cell']=='all' and x['mana']>=x['originalMana']>=0 and x['alternativeMana']>=0
                assert point['original']['type']=='skill' and point['original']['skill'] in ['advanced_scan','scan','ally_scan','enemy_scan','troll_scan','troll_ally_scan','troll_enemy_scan','truth_gem'] and point['original']['target']!='p1'
                assert point['executed']==(point['original'] if v=='control' else point['alternative'])
                for k in ['stateHash','memoryHash','viewHash','alternativeMemoryHash']:assert len(point[k])==64 and set(point[k])<=set('0123456789abcdef')
                if point['executed'] is not None:
                    actual=next(t for t in r['actions'] if t['at']==point['at'] and t['action']==point['executed']);assert point['accepted']==actual['accepted'] and point['error']==actual['error']
                    if v=='control':assert actual['nominalMana']==x['originalMana']
                    elif actual['action']['type']=='skill':assert actual['nominalMana']==x['alternativeMana']
                else:assert point['accepted'] is None and point['error'] is None and not any(t['at']==point['at'] and t['action']['type']=='skill' for t in r['actions'])
                if v=='normal':
                    if same_checks:b['laterSameCheck']+=1;b['laterSameCheckDelayMs']+=min(same_checks)-point['at']
                    else:b['laterSameCheckNever']+=1
                b['resources'][v].update({k:z for k,z in res.items() if type(z) in [int,float,bool] and k not in ['firstSameCheckAt','firstSameCheckDelayMs','firstExactReportedFactAt','manaAtEnd','aliveAtEnd']})
            else:assert not r['actions'] and res['aliveMs']==res['turns']==0
            records[(mode,style,*key,v)]=r;out['executions']+=1
        assert bool(points[0])==bool(points[1]);out['pairs']+=1;b['pairs']+=1;diff=scores[1]-scores[0];diffs[f['seed']].append(diff)
        if points[0]:
            for k in ['at','player','cell','stateHash','memoryHash','viewHash','alternativeMemoryHash','before','original','alternative']:assert points[0][k]==points[1][k]
            intervened_diffs[f['seed']].append(diff);alternatives['null' if points[0]['alternative'] is None else points[0]['alternative'].get('skill',points[0]['alternative']['type'])]+=1
            alternatives['sameAction' if points[0]['original']==points[0]['alternative'] else 'differentAction']+=1
            out['intervenedPairs']+=1;b['intervened']+=1;b['originalCheckRejected']+=points[0]['accepted'] is False;changes['better' if diff>0 else 'worse' if diff<0 else 'same']+=1
        else:assert pair['control']==pair['normal'];out['nonIntervenedEqualPairs']+=1
    if not a.allow_partial:assert len(fs)==d['count']*4
for b in out['modes'].values():b['controlScore']/=b['pairs'];b['normalScore']/=b['pairs']
assert out['executions']==d['executions']
if not a.allow_partial:assert d['complete'] and len(seen)==12 and out['executions']==d['count']*4*3*4*2
values=[sum(x)/len(x) for _,x in sorted(diffs.items())];out['difference']=sum(values)/len(values);rng=random.Random(0x475354);means=sorted(sum(rng.choices(values,k=len(values)))/len(values) for _ in range(10000));out['seedBootstrap95']=[means[250],means[9749]];out['intervenedOutcomes']=changes
if a.journal_path:
    raw=read(a.journal_path);assert hashlib.sha256(raw).hexdigest()==d['journalSha256'];lines=raw.splitlines();h=json.loads(lines.pop(0));assert h['fingerprint']==d['fingerprint'] and h['meta']==meta;journal={}
    for line in lines:
        x=json.loads(line);f=x['result']['game']['fixture'];k=(x['mode'],x['style'],f['seed'],f['reversed'],f['currentSide'],x['variant']);assert k not in journal;journal[k]=x['result']
    assert journal==records;out['journalVerified']=True
iv=[sum(x)/len(x) for _,x in sorted(intervened_diffs.items())];eligible=out['complete'] and out['intervenedPairs']>=64 and len(iv)>=16 and safe
ci=None
if eligible:
    rng=random.Random(0x475354);boot=sorted(sum(rng.choices(iv,k=len(iv)))/len(iv) for _ in range(10000));ci=[boot[50],boot[9949]]
out['selection']={'groups':1,'pairs':out['intervenedPairs'],'seeds':len(iv),'safetyPassed':safe,'eligible':eligible,'seedBootstrap99':ci,'candidate':bool(eligible and ci[0]>0),'alternatives':alternatives}
if d.get('persistence')=={'version':2}:
    assert a.journal_path,'v2 verification requires journal'
    base=str(a.path).removesuffix('.gz').removesuffix('.json')
    publication=json.loads(pathlib.Path(base+'.publication.json').read_text())
    assert publication=={'version':2,'fingerprint':d['fingerprint'],'executions':d['executions'],'complete':d['complete'],'snapshotSHA256':hashlib.sha256(read(a.path)).hexdigest(),'journalSHA256':hashlib.sha256(read(a.journal_path)).hexdigest()}
    out['publicationVerified']=True
print(json.dumps(out,ensure_ascii=False,indent=2))

