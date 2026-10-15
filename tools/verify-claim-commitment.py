"""Independent fixture, receipt, actual-action resource, source and journal checks."""
import argparse, collections, gzip, hashlib, json, pathlib, random, re, subprocess
p=argparse.ArgumentParser();p.add_argument('path',type=pathlib.Path);p.add_argument('--source-ref');p.add_argument('--journal-path',type=pathlib.Path);p.add_argument('--allow-partial',action='store_true');a=p.parse_args()
def read(path):
    raw=path.read_bytes();return gzip.decompress(raw) if path.suffix=='.gz' else raw
d=json.loads(read(a.path));assert d['phase'] in ['development','holdout']
specs={'claim-turn-commitment-comparison':('commitment',{'claimTurnCommitment':True}),'idle-manual-true-claim-mana-comparison':('idleClaimMana',{'idleClaimMana':True})}
candidate,options=specs[d['kind']]
assert d['variants']==['baseline','control',candidate] and d['options']=={'baseline':{},'control':{},candidate:options}
if not a.allow_partial:assert d['complete'] and d['executions']==d['count']*4*3*4*3
if a.source_ref:
    files=subprocess.check_output(['git','ls-tree','-r','--name-only',a.source_ref,'packages/rules/src'],text=True).splitlines()
    expected_sources={x.removeprefix('packages/rules/') for x in files if x.endswith('.ts')}
else:expected_sources={'src/'+str(x.relative_to('packages/rules/src')) for x in pathlib.Path('packages/rules/src').rglob('*.ts')}
expected_sources|={'scripts/'+x for x in ['cooperative-claim-commitment.ts','cooperative-commitment-match.ts','league-runner.ts','baselines/pre-cooperative.ts','claim-opponents.ts']}
assert set(d['sourceHashes'])==expected_sources and set(d['auxiliarySourceHashes'])=={'tools/verify-claim-commitment.py'}
for group,prefix in [('sourceHashes','packages/rules/'),('auxiliarySourceHashes','')]:
    for path,sha in d[group].items():
        assert '..' not in pathlib.PurePosixPath(path).parts
        source=subprocess.check_output(['git','show',a.source_ref+':'+prefix+path]) if a.source_ref else pathlib.Path(prefix+path).read_bytes()
        assert hashlib.sha256(source).hexdigest()==sha,path
meta={k:v for k,v in d.items() if k not in ['fingerprint','complete','executions','journalSha256','records']}
assert hashlib.sha256(json.dumps(meta,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()==d['fingerprint']
out={'format':1,'phase':d['phase'],'complete':d['complete'],'executions':len(d['records']),'start':d['start'],'seeds':d['count'],'fingerprint':d['fingerprint'],'sourceHashes':d['sourceHashes'],'variants':{},'contrasts':{},'promotionEvidence':False}
seen=set();scores=collections.defaultdict(lambda:collections.defaultdict(list));fixture_sets=collections.defaultdict(set)
for x in d['records']:
    mode,style,v=x['mode'],x['style'],x['variant'];r=x['result'];g,res=r['game'],r['resources'];f=g['fixture']
    assert mode in ['civil_war','primordial','lidellut','troll'] and style in ['truthful','bluff','skill-aware-bluff'] and v in d['variants'] and f['mode']==mode
    assert d['start']<=f['seed']<d['start']+d['count'] and f['count']==8+(f['seed']-d['start'])%5 and type(f['reversed']) is bool and f['currentSide'] in [1,2]
    key=(mode,style,f['seed'],f['reversed'],f['currentSide']);assert (key,v) not in seen;seen.add((key,v));fixture_sets[v].add(key)
    assert g['winnerPolicy']==(None if g['winner'] is None else 'current' if g['winner']==f['currentSide'] else 'reference')
    score=.5 if g['winnerPolicy'] is None else float(g['winnerPolicy']=='current');scores[v][f['seed']].append(score)
    assert len(r['actions'])==g['stats']['current']['attempted'] and sum(t['accepted'] for t in r['actions'])==g['stats']['current']['accepted']
    for stat in g['stats'].values():assert stat['attempted']==stat['accepted']+stat['rejected']
    assert 0<=g['elapsedMs']<=d['settings']['limitMs'] and 0<=res['trueNameMs']<=res['aliveMs']<=g['elapsedMs']*f['count']
    assert 0<=res['holdingMs']<=res['trueNameMs'] and res['holdStarts']==len(r['holds'])
    for h in r['holds']:
        assert v=='commitment' and h['trueName'] and not h['hasDisguise'] and 0<=h['publishedAt']<=h['at']<h['until']==h['at']+h['nextTurnInMs']
    expected=collections.Counter();skills={};safety=collections.Counter()
    for t in r['actions']:
        act=t['action'];assert t['side']==f['currentSide'] and 0<=t['at']<=g['elapsedMs'] and t['beforeMana']>=0 and t['afterMana']>=0
        if t['holding']:
            assert t['beforeTrueName'] and any(h['player']==t['player'] and h['character']==t['character'] and h['at']<=t['at']<h['until'] for h in r['holds'])
        if act['type']=='skill':
            k=act['skill'];s=skills.setdefault(k,{'accepted':0,'rejected':0,'nominalMana':0,'netManaDelta':0,'whileHolding':0})
            if t['accepted']:
                s['accepted']+=1;s['nominalMana']+=t['nominalMana'];s['netManaDelta']+=t['afterMana']-t['beforeMana'];s['whileHolding']+=t['holding'];expected['acceptedSkillMana']+=t['nominalMana']
                if k=='publish':
                    truthful=act.get('name')==t['character'];delta=t['afterMana']-t['beforeMana'];assert delta==min(t['maxMana'],t['beforeMana']+5)-t['beforeMana']
                    expected['publishes']+=1;expected['truePublishes' if truthful else 'falsePublishes']+=1;expected['publishManaGross']+=5;expected['publishManaNet']+=delta;safety['holdingFalsePublishes']+=int(t['holding'] and not truthful)
                    if 'beforePublished' in t and act.get('name')==t['beforePublished']:
                        expected['reaffirmations']+=1;expected['reaffirmManaNet']+=delta
                        if v=='idleClaimMana':
                            assert truthful and t['beforeTrueName'] and t['manualSameName'] and t['activeDecision'] and t['beforeMana']+5<=t['maxMana'] and delta==5
                            assert t['reaffirmationProof']=={'originalNull':True,'ownMemoryEqual':True,'ownRngEqual':True}
                if k=='ally':
                    expected['allies']+=1;expected['allyManaNet']+=t['beforeMana']-t['afterMana'];safety['wrongAllies']+=int(t['grading']['allyTargetSide']!=t['side'])
            else:s['rejected']+=1
        if t['grading']['report']:
            assert t['accepted'] and act['type']=='chat';match=re.fullmatch(r'확인 정보: \[(\d+)\] (.+)',act['text']);safety['falseReports']+=int(not match or match[2]!=t['grading']['reportExpectedName'])
    assert skills==res['skills']
    for k in ['publishes','truePublishes','falsePublishes','publishManaGross','publishManaNet','allies','allyManaNet','acceptedSkillMana']:assert res[k]==expected[k],k
    if 'reaffirmations' in res:
        for k in ['reaffirmations','reaffirmManaNet']:assert res[k]==expected[k],k
    for k in ['wrongAllies','falseReports','holdingFalsePublishes']:assert r['safety'][k]==safety[k],k
    assert res['turns']==len(r['turns']) and res['trueNameTurns']==sum(t['trueName'] for t in r['turns']) and res['trueNameBonusGross']==10*res['trueNameTurns']
    assert res['turnGainGross']==sum(t['gain'] for t in r['turns']) and res['incomingAllyManaGross']==10*sum(t['allies'] for t in r['turns'])
    assert res['holdingTrueNameTurns']==sum(t['holding'] and t['trueName'] for t in r['turns'])
    for t in r['turns']:assert t['gain']==20+10*t['allies']+10*t['trueName'] and t['gem'] in [0,1,2,3] and 0<=t['at']<=g['elapsedMs']
    b=out['variants'].setdefault(v,{}).setdefault(mode,{'games':0,'scoreSum':0,'unfinished':0,'earlyAttackFailures':0,'rejected':0,'resources':collections.Counter(),'safety':collections.Counter(),'skills':{}})
    b['games']+=1;b['scoreSum']+=score;b['unfinished']+=int(g['winner'] is None);b['earlyAttackFailures']+=g['stats']['current']['earlyAttackFailures'];b['rejected']+=g['stats']['current']['rejected'];b['safety'].update(r['safety'])
    b['resources'].update({k:z for k,z in res.items() if k!='skills'})
    for k,z in skills.items():b['skills'].setdefault(k,collections.Counter()).update(z)
assert out['executions']==d['executions']
for v,modes in out['variants'].items():
    for mode,b in modes.items():b['score']=b['scoreSum']/b['games']
    if not a.allow_partial:assert len(fixture_sets[v])==d['count']*4*3*4 and set(modes)=={'civil_war','primordial','lidellut','troll'}
if not a.allow_partial:
    assert fixture_sets['baseline']==fixture_sets['control']==fixture_sets[candidate]
    for left,right in [(candidate,'control'),(candidate,'baseline')]:
        values=[sum(scores[left][s])/len(scores[left][s])-sum(scores[right][s])/len(scores[right][s]) for s in range(d['start'],d['start']+d['count'])]
        rng=random.Random(0x475354);means=sorted(sum(rng.choices(values,k=len(values)))/len(values) for _ in range(10000))
        out['contrasts'][left+'-'+right]={'difference':sum(values)/len(values),'seedBootstrap95':[means[250],means[9749]],'byMode':{m:out['variants'][left][m]['score']-out['variants'][right][m]['score'] for m in out['variants'][left]}}
    safe=not any(sum(b['safety'].values())+b['earlyAttackFailures'] for b in out['variants'][candidate].values())
    out['developmentGatePassed']=safe and out['contrasts'][candidate+'-control']['difference']>0 and out['contrasts'][candidate+'-baseline']['difference']>=0
    c=out['contrasts'][candidate+'-baseline'];out['holdoutGatePassed']=d['phase']=='holdout' and safe and c['seedBootstrap95'][0]>0 and min(c['byMode'].values())>=-.02
if a.journal_path:
    raw=read(a.journal_path);assert hashlib.sha256(raw).hexdigest()==d['journalSha256'];lines=raw.splitlines();header=json.loads(lines.pop(0));assert header['fingerprint']==d['fingerprint'] and header['meta']==meta
    assert [json.loads(line) for line in lines]==d['records'];out['journalVerified']=True
print(json.dumps(out,ensure_ascii=False,indent=2))
