"""Independent validation of identical-policy guard evaluation; no policy tuning."""
import argparse, collections, gzip, hashlib, json, pathlib, random, subprocess
def read(p):
    b=p.read_bytes()
    return gzip.decompress(b) if p.suffix=='.gz' else b
def sha(b):return hashlib.sha256(b).hexdigest()
def encoded(x):return json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()
def interval(xs):
    rng=random.Random(0x475354)
    samples=sorted(sum(rng.choices(xs,k=len(xs)))/len(xs) for _ in range(10000))
    return [samples[250],samples[9749]]
def verify(path,journal_path,source_ref=None,partial=False):
    raw=read(path);d=json.loads(raw);journal=read(journal_path)
    assert d['kind']=='identical-guard-policy-primordial'
    variants=['cooperative','knownCommanderGuardBeforeAlly']
    assert d['variants']==variants and d['options']==dict(zip(variants,[{}, {'knownCommanderGuardBeforeAlly':True}]))
    assert d['optionsSHA256']==sha(encoded(d['options']))
    assert d['design']==dict(unit='seed',orders=2,currentSide=1,policiesIdenticalOnBothTeams=True,skillValuesChanged=False,exploratory=True,holdout=False,playerCount='8+(seed-start)%5')
    assert d['settings']==dict(tickMs=250,activity=0.012,limitMs=5400000)
    meta={k:v for k,v in d.items() if k not in ['fingerprint','complete','executions','journalSha256','records']}
    assert sha(encoded(meta))==d['fingerprint']
    lines=[json.loads(x) for x in journal.splitlines()]
    assert lines[0]==dict(type='header',fingerprint=d['fingerprint'],meta=meta)
    assert lines[1:]==d['records'] and sha(journal)==d['journalSha256']
    pub=json.loads(pathlib.Path(str(path).removesuffix('.gz').removesuffix('.json')+'.publication.json').read_text())
    assert pub==dict(version=2,fingerprint=d['fingerprint'],executions=d['executions'],complete=d['complete'],snapshotSHA256=sha(raw),journalSHA256=sha(journal))
    files=subprocess.check_output(['git','ls-tree','-r','--name-only',source_ref,'packages/rules/src'],text=True).splitlines() if source_ref else [str(p) for p in pathlib.Path('packages/rules/src').rglob('*.ts')]
    expected={p.removeprefix('packages/rules/') for p in files if p.endswith('.ts')}
    expected|={'scripts/'+p for p in ['guard-selfplay.ts','guard-selfplay-run.ts','cooperative-commitment-match.ts','league-runner.ts','cooperative-store.ts','claim-opponents.ts','baselines/pre-cooperative.ts','baselines/pre-round024.ts']}
    assert set(d['sourceHashes'])==expected and set(d['auxiliarySourceHashes'])=={'tools/verify-guard-selfplay.py','tools/run-guard-selfplay.py'}
    for group,prefix in [('sourceHashes','packages/rules/'),('auxiliarySourceHashes','')]:
        for p,h in d[group].items():
            assert '..' not in pathlib.PurePosixPath(p).parts
            content=subprocess.check_output(['git','show',source_ref+':'+prefix+p]) if source_ref else pathlib.Path(prefix+p).read_bytes()
            assert sha(content)==h,p
    rows={};summary={v:{'games':0,'side1Wins':0,'side2Wins':0,'unfinished':0,'failedAttacks':0,'rejectedActions':0,'nominalSkillMana':0,'netSkillManaDelta':0,'incomingAllyManaGross':0,'guard':collections.Counter(),'guardByRole':{},'byCount':{},'bySide':{}} for v in variants}
    for x in d['records']:
        v=x['variant'];assert v in variants
        r=x['result'];g=r['game'];f=g['fixture'];key=(f['seed'],f['reversed'])
        assert (v,key) not in rows;rows[v,key]=x
        assert f['mode']=='primordial' and f['currentSide']==1 and type(f['reversed']) is bool
        assert d['start']<=f['seed']<d['start']+d['count'] and f['count']==8+(f['seed']-d['start'])%5
        assert g['winner'] in [None,1,2] and g['winnerPolicy']==(None if g['winner'] is None else 'current' if g['winner']==1 else 'reference')
        assert 0<g['elapsedMs']<=d['settings']['limitMs']
        roles={p['id']:p for p in x['roles']};assert len(roles)==f['count'] and len({p['character'] for p in roles.values()})==f['count']
        assert {p['character'] for p in g['survivors']}=={p['character'] for p in roles.values()}
        for p in g['survivors']:assert p['controller']==('current' if next(z['side'] for z in roles.values() if z['character']==p['character'])==1 else 'reference')
        b=summary[v];b['games']+=1;b['unfinished']+=g['winner'] is None
        if g['winner']:b['side'+str(g['winner'])+'Wins']+=1
        c=b['byCount'].setdefault(str(f['count']),dict(games=0,side1Wins=0,side2Wins=0,unfinished=0));c['games']+=1;c['unfinished']+=g['winner'] is None
        if g['winner']:c['side'+str(g['winner'])+'Wins']+=1
        skills={};actions=collections.defaultdict(list);failures=0
        for t in r['actions']:
            assert roles[t['player']]['character']==t['character'] and roles[t['player']]['side']==t['side']
            assert 0<=t['at']<=g['elapsedMs'] and 0<=t['beforeMana']<=t['maxMana'] and 0<=t['afterMana']<=t['maxMana']
            actions[t['player'],t['at']].append(t)
            side=b['bySide'].setdefault(str(t['side']),collections.Counter());side['actions']+=1;side['rejected']+=not t['accepted']
            act=t['action'];failures+='attack.fail.self' in t['receiptKinds']
            if act['type']=='skill':
                z=skills.setdefault(act['skill'],dict(accepted=0,rejected=0,nominalMana=0,netManaDelta=0,whileHolding=0))
                z['accepted']+=t['accepted'];z['rejected']+=not t['accepted']
                if t['accepted']:
                    z['nominalMana']+=t['nominalMana'];z['netManaDelta']+=t['afterMana']-t['beforeMana']
                    side['nominalSkillMana']+=t['nominalMana'];side['netSkillManaDelta']+=t['afterMana']-t['beforeMana']
            assert not t['holding']
        assert skills==r['resources']['skills'] and failures==r['resources']['attackFailures']
        assert r['resources']['acceptedSkillMana']==sum(z['nominalMana'] for z in skills.values())
        assert r['resources']['incomingAllyManaGross']==sum(10*t['allies'] for t in r['turns'])
        for side,controller in [(1,'current'),(2,'reference')]:
            aa=[t for t in r['actions'] if t['side']==side];s=g['stats'][controller]
            assert s['attempted']==len(aa) and s['accepted']==sum(t['accepted'] for t in aa) and s['rejected']==sum(not t['accepted'] for t in aa)
        b['failedAttacks']+=failures;b['rejectedActions']+=sum(not t['accepted'] for t in r['actions']);b['nominalSkillMana']+=r['resources']['acceptedSkillMana']
        b['netSkillManaDelta']+=sum(z['netManaDelta'] for z in skills.values());b['incomingAllyManaGross']+=r['resources']['incomingAllyManaGross']
        seen=set()
        for t in r['guardDecisions']:
            assert (t['player'],t['at']) not in seen;seen.add((t['player'],t['at']))
            assert roles[t['player']]['character']==t['character'] and roles[t['player']]['side']==t['ownSide']
            skill,name={'consume':('consume_master_guard','eltas'),'kumarin':('kumarin_commander_guard','rael')}[t['character']]
            assert t['guardSkill']==skill and t['guardCost']==50 and t['usesLeft']==1 and t['ownMemoryEqual'] and t['ownRngEqual']
            assert t['knownName'] in [None,name] and (t['target'] is None)==(t['knownName'] is None)
            if t['target']:assert roles[t['target']]['character']==t['knownName'] and roles[t['target']]['side']==t['knownSide']
            assert t['reserve']==max([0]+[z['cost'] for z in t['reservedAttacks']])
            for z in t['reservedAttacks']:assert z['skill'] in ['attack','advanced_attack','supreme_attack','soen_chain_murder'] and 0<z['cooldown']<=20000 and 0<z['cost']<=t['mana'] and roles[z['knownEnemy']]['character']==z['name'] and roles[z['knownEnemy']]['side']!=t['ownSide']
            ready=not t['passive'] and t['blocked'] is None and t['cooldown']==0 and t['mana']>=t['guardCost']
            original,chosen=t['originalAction'],t['chosenAction']
            reason='skill_unavailable' if not ready else 'identity_unconfirmed' if t['target'] is None else 'target_dead' if not t['targetAlive'] else 'not_ally' if t['knownSide']!=t['ownSide'] else 'target_invulnerable' if t['targetProtected'] else 'attack_reserve' if t['guardCost']>t['mana']-t['reserve'] else 'other_original_choice' if not original or original['type']!='skill' or original['skill']!='ally' else 'eligible'
            assert reason==t['reason'] and t['eligible']==(reason=='eligible')
            selected=bool(t['target'] and chosen==dict(type='skill',skill=skill,target=t['target']));assert selected==t['selectedGuard']
            if chosen:
                aa=[a for a in actions[t['player'],t['at']] if a['action']==chosen];assert len(aa)==1 and aa[0]['accepted']==t['accepted'] and aa[0]['beforeMana']==t['mana']
            else:assert t['accepted'] is None
            if selected:assert t['actualName']==name and t['actualSide']==t['ownSide'] and t['success']==('skill.'+skill in aa[0]['receiptKinds'])
            if v==variants[1] and t['eligible']:assert selected and t['accepted'] and t['success']
            else:assert original==chosen
            values={'decisions':1,'reason:'+reason:1,'eligible':int(t['eligible']),'selected':int(t['eligible'] and selected),'success':int(bool(t['eligible'] and selected and t['success']))}
            b['guard'].update(values);b['guardByRole'].setdefault(t['character'],collections.Counter()).update(values)
        assert not any(r['safety'].values()),r['safety']
    assert len(rows)==d['executions']
    if not partial:assert d['complete'] and len(rows)==d['count']*4
    paired=[];no_intervention=0;first_divergences=[]
    for seed in range(d['start'],d['start']+d['count']):
        values=[]
        for rev in [False,True]:
            if any((v,(seed,rev)) not in rows for v in variants):continue
            left,right=[rows[v,(seed,rev)]['result'] for v in variants]
            score=lambda r:0.5 if r['game']['winner'] is None else int(r['game']['winner']==1)
            values.append(score(right)-score(left))
            # Receipt kind additions are identical for both profiles; compare full action streams.
            if not any(t['eligible'] for t in right['guardDecisions']):
                assert left['game']==right['game'] and left['actions']==right['actions'] and left['resources']==right['resources'];no_intervention+=1
            else:
                pairs=zip(left['actions'],right['actions']);first=next(((a,b) for a,b in pairs if a!=b),None);assert first
                a,b=first
                proof=next(t for t in right['guardDecisions'] if t['eligible'])
                assert a['player']==b['player']==proof['player'] and a['at']==b['at']==proof['at'] and a['action']==proof['originalAction'] and b['action']==proof['chosenAction']
                first_divergences.append(dict(seed=seed,reversed=rev,at=b['at'],player=b['player'],original=a['action'],chosen=b['action']))
        if len(values)==2:paired.append(dict(seed=seed,count=8+(seed-d['start'])%5,delta=sum(values)/2))
    for v,b in summary.items():
        for count in [None,8,9,10,11,12]:
            units=[]
            for seed in range(d['start'],d['start']+d['count']):
                if count and 8+(seed-d['start'])%5!=count:continue
                rr=[rows[v,(seed,rev)]['result']['game']['winner'] for rev in [False,True] if (v,(seed,rev)) in rows]
                if len(rr)==2:units.append(sum(.5 if w is None else int(w==1) for w in rr)/2)
            if units:
                cell=b if count is None else b['byCount'][str(count)];cell['seedCount']=len(units);cell['side1Score']=sum(units)/len(units);cell['seedBootstrap95']=interval(units)
    contrasts={}
    for count in [None,8,9,10,11,12]:
        xs=[p['delta'] for p in paired if count is None or p['count']==count]
        if xs:contrasts[str(count) if count else 'all']={'seeds':len(xs),'side1Delta':sum(xs)/len(xs),'seedBootstrap95':interval(xs)}
    return dict(kind=d['kind'],complete=d['complete'],executions=d['executions'],sourceRef=source_ref,optionsSHA256=d['optionsSHA256'],snapshotSHA256=sha(raw),journalSHA256=sha(journal),publicationVerified=True,variants=summary,pairedContrasts=contrasts,nonintervenedPairsIdentical=no_intervention,firstDivergences=first_divergences,limitations=['Synthetic bots; actual human matches zero.','Faction outcomes are not policy strength.','Bootstrap [0,0] from tied samples is not population equivalence.','Guard trajectory opportunities are not identical after intervention.'])
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('path',type=pathlib.Path);p.add_argument('--journal-path',type=pathlib.Path,required=True);p.add_argument('--source-ref');p.add_argument('--allow-partial',action='store_true');a=p.parse_args()
    print(json.dumps(verify(a.path,a.journal_path,a.source_ref,a.allow_partial),ensure_ascii=False,indent=2))
