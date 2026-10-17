"""Independent validation of identical-policy report evaluation; no policy tuning."""
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
    assert d['kind']=='identical-report-policy-primordial'
    variants=['cooperative','reportedSupreme']
    assert d['variants']==variants and d['options']==dict(zip(variants,[{}, {'reportedSupreme':True}]))
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
    expected|={'scripts/'+p for p in ['report-selfplay.ts','report-selfplay-run.ts','cooperative-commitment-match.ts','reported-supreme-opportunities.ts','league-runner.ts','cooperative-store.ts','claim-opponents.ts','baselines/pre-cooperative.ts','baselines/pre-round024.ts']}
    assert set(d['sourceHashes'])==expected and set(d['auxiliarySourceHashes'])=={'tools/verify-report-selfplay.py','tools/run-report-selfplay.py'}
    for group,prefix in [('sourceHashes','packages/rules/'),('auxiliarySourceHashes','')]:
        for p,h in d[group].items():
            assert '..' not in pathlib.PurePosixPath(p).parts
            content=subprocess.check_output(['git','show',source_ref+':'+prefix+p]) if source_ref else pathlib.Path(prefix+p).read_bytes()
            assert sha(content)==h,p
    rows={};summary={v:{'games':0,'side1Wins':0,'side2Wins':0,'unfinished':0,'failedAttacks':0,'rejectedActions':0,'nominalSkillMana':0,'netSkillManaDelta':0,'incomingAllyManaGross':0,'report':collections.Counter(),'byCount':{},'bySide':{},'byRole':{}} for v in variants}
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
        for survivor in g['survivors']:
            role=survivor['character'];side=next(p['side'] for p in roles.values() if p['character']==role)
            cell=b['byRole'].setdefault(role,dict(side=side,games=0,survived=0,teamWins=0));cell['games']+=1;cell['survived']+=survivor['alive'];cell['teamWins']+=g['winner']==side
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
        supreme=r.get('supremeDecisions',[])
        sc=collections.Counter();decision_keys=set();wrong_supreme=0
        if v=='reportedSupreme':assert r['supremeActiveDecisions']==len(supreme)
        for t in supreme:
            assert v=='reportedSupreme' and t['mode']=='primordial' and t['side']==roles[t['player']]['side'] and t['character']==roles[t['player']]['character'] and t['knowledgeUnchanged']
            dk=(t['player'],t['at']);assert dk not in decision_keys;decision_keys.add(dk)
            assert 0<=t['at']<=g['elapsedMs'] and 0<=t['mana']<=150 and t['changed']==(t['originalAction']!=t['chosenAction'])
            eligible=[];skill=t['skill'];sc['activeDecisions']+=1;sc['withSupreme']+=skill is not None;sc['withTrustedReport']+=bool(t['targets'])
            assert len({z['id'] for z in t['targets']})==len(t['targets'])
            for z in t['targets']:
                assert z['alive'] and not z['known'] and z['id']!=t['player'] and z['senders']
                guards={'civil_war':{'kai':['arin'],'dantes':['kelhu']},'lidellut':{'kai':['arin']},'troll':{'chis':['satoshi','zwinra']}}.get('primordial',{}).get(z['name'],[])
                assert z['guardsAlive']==[guard for guard in guards if guard not in t['observedDead']]
                reason='no_skill' if not skill else 'skill_blocked' if skill['blocked'] is not None else 'before_four_minutes' if t['at']<240000 else 'reserve_mana' if t['mana']<max(100,skill['mana']) else 'friendly_report' if z['side']==t['side'] else 'mandatory_guard_alive' if z['guardsAlive'] else 'name_unavailable' if not z['nameAllowed'] else 'public_invulnerable' if not skill['ignoresInvulnerable'] and z['invulnerable'] else 'own_same_name_failure' if z['ownSameNameFailure'] else 'eligible'
                assert z['reason']==reason;sc['target:'+reason]+=1
                target_id=int(z['id'].removeprefix('p'));assert z['seat']==(f['count']+1-target_id if f['reversed'] else target_id)
                for sender in z['senders']:
                    e=sender['event'];assert sender['id']!=t['player'] and e['seq']==sender['seq'] and e['at']==sender['at']<=t['at']
                    assert e['kind'] in ['chat.whisper','chat.ally'] and e['vis']['to']=='players' and t['player'] in e['vis']['ids'] and e['data']['from']==sender['id']
                    assert e['data']['text']==f"확인 정보: [{z['seat']}] {z['label']}" and not e.get('facts')
                if reason=='eligible':eligible.append(z)
            eligible.sort(key=lambda z:(-int(z['commander']),z['seat']))
            suggestion={'type':'skill','skill':'supreme_attack','target':eligible[0]['id'],'name':eligible[0]['name']} if eligible else None
            assert t['suggestion']==suggestion and t['selected']==(suggestion is not None and suggestion==t['chosenAction'])
            if t['changed']:assert t['selected']
            sc['eligible']+=bool(eligible);sc['selected']+=t['selected'];sc['changed']+=t['changed']
            sc['higherPriorityPreserved']+=bool(eligible) and not t['selected'];sc['idleReplaced']+=t['changed'] and t['originalAction'] is None
            sc['alreadySame']+=t['selected'] and not t['changed']
            if t['selected']:
                h=t['receipt'];assert h is not None and h['actualName'] is not None and h['actualSide'] in [1,2] and h['accepted']==(h['error'] is None)
                actual=[z for z in r['actions'] if z['player']==t['player'] and z['at']==t['at'] and z['action']==suggestion]
                assert len(actual)==1 and actual[0]['accepted']==h['accepted'] and actual[0]['beforeMana']==t['mana'] and actual[0]['afterMana']-t['mana']==h['manaDelta']
                if h['accepted']:assert any(k in ['attack.hit','attack.kill','attack.guarded','attack.fail','attack.fail.death'] for k in h['receiptKinds'])
                wrong=h['actualName']!=suggestion['name'] or h['actualSide']==t['side'];wrong_supreme+=wrong
                sc['accepted']+=h['accepted'];sc['rejected']+=not h['accepted'];sc['wrong']+=wrong;sc['attackFailure']+=any(k in ['attack.fail.self','attack.fail','attack.fail.death'] for k in h['receiptKinds'])
                sc['nominalMana']+=actual[0]['nominalMana'];sc['netManaDelta']+=h['manaDelta'];sc['commanderAttacks']+=eligible[0]['commander']
            else:assert t['receipt'] is None
    
        assert r['safety']['wrongReportedAttacks']==wrong_supreme
        for t in supreme:
            side=b['bySide'].setdefault(str(t['side']),collections.Counter());side['activeReportChoices']+=1
            side['eligibleReportChoices']+=t['suggestion'] is not None;side['selectedReports']+=t['selected'];side['changedReports']+=t['changed']
            side['idleReplaced']+=t['changed'] and t['originalAction'] is None
            for z in t['targets']:
                for sender in z['senders']:
                    assert roles[sender['id']]['character']==sender['knownRole'] and roles[sender['id']]['side']==t['side']
            if t['selected']:
                h=t['receipt'];target=roles[t['suggestion']['target']]
                assert h['actualName']==target['character'] and h['actualSide']==target['side']
                aa=[a for a in actions[t['player'],t['at']] if a['action']==t['chosenAction']]
                assert len(aa)==1 and aa[0]['receiptKinds']==h['receiptKinds']
                side['acceptedReports']+=h['accepted'];side['failedReports']+=any(k in ['attack.fail.self','attack.fail','attack.fail.death'] for k in h['receiptKinds'])
        b['report'].update(sc)
        expected_safety=collections.Counter(wrongReportedAttacks=wrong_supreme)
        for t in r['actions']:
            act=t['action'];grade=t['grading']
            if t['accepted'] and act['type']=='skill' and act['skill']=='ally':expected_safety['wrongAllies']+=grade['allyTargetSide']!=t['side']
            if t['accepted'] and act['type']=='skill' and act['skill']=='break_ally':expected_safety['wrongBreaks']+=grade['breakTargetSide'] is None or grade['breakTargetSide']==t['side'] or not grade['breakKnownName'] or grade['breakKnownName']!=grade['breakTargetName']
            if grade['report']:
                text=act['text'].split('] ',1)[-1];expected_safety['falseReports']+=text!=grade['reportExpectedName']
        assert all(r['safety'][k]==expected_safety[k] for k in r['safety']),r['safety']
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
            # A same immediate action can consume a different RNG path. Do not infer no treatment from changed=False.
            if left['game']==right['game'] and left['actions']==right['actions'] and left['resources']==right['resources']:no_intervention+=1
            else:
                aa,bb=left['actions'],right['actions'];i=next((i for i,(a,b) in enumerate(zip(aa,bb)) if a!=b),min(len(aa),len(bb)))
                a=aa[i] if i<len(aa) else None;b=bb[i] if i<len(bb) else None
                first_divergences.append(dict(seed=seed,reversed=rev,original=a,chosen=b,hasEarlierReport=any(t['selected'] and t['at']<=max((a or {}).get('at',0),(b or {}).get('at',0)) for t in right['supremeDecisions'])))
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
    return dict(kind=d['kind'],complete=d['complete'],executions=d['executions'],sourceRef=source_ref,optionsSHA256=d['optionsSHA256'],snapshotSHA256=sha(raw),journalSHA256=sha(journal),publicationVerified=True,variants=summary,pairedContrasts=contrasts,fullTrajectoryIdenticalPairs=no_intervention,firstDivergences=first_divergences,limitations=['Synthetic bots; actual human matches zero.','Faction outcomes are not policy strength.','Bootstrap [0,0] from tied samples is not population equivalence.','OFF and ON trajectory opportunities are not interchangeable; same-action RNG timing may differ.'])
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('path',type=pathlib.Path);p.add_argument('--journal-path',type=pathlib.Path,required=True);p.add_argument('--source-ref');p.add_argument('--allow-partial',action='store_true');a=p.parse_args()
    print(json.dumps(verify(a.path,a.journal_path,a.source_ref,a.allow_partial),ensure_ascii=False,indent=2))
