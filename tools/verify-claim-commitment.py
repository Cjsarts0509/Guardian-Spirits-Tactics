"""Independent fixture, receipt, actual-action resource, source and journal checks."""
import argparse, collections, gzip, hashlib, json, pathlib, random, re, subprocess
def exact_seed_contrast(units,per_seed):
    """Accumulate integer/half-point results before division; a true tie stays exactly zero."""
    rng=random.Random(0x475354)
    means=sorted(sum(rng.choices(units,k=len(units)))/len(units)/per_seed for _ in range(10000))
    return sum(units)/len(units)/per_seed,[means[250],means[9749]]
p=argparse.ArgumentParser();p.add_argument('path',type=pathlib.Path);p.add_argument('--source-ref');p.add_argument('--journal-path',type=pathlib.Path);p.add_argument('--allow-partial',action='store_true');a=p.parse_args()
def read(path):
    raw=path.read_bytes();return gzip.decompress(raw) if path.suffix=='.gz' else raw
d=json.loads(read(a.path));assert d['phase'] in ['development','holdout']
specs={'known-commander-guard-before-ally-comparison':('knownCommanderGuardBeforeAlly',{'knownCommanderGuardBeforeAlly':True}),'own-attack-outcome-knowledge-comparison':('learnOwnAttackOutcome',{'learnOwnAttackOutcome':True}),'first-warning-trusted-report-comparison':('reportedFirstWarning',{'reportedFirstWarning':True}),'repeated-warned-failed-guess-comparison':('avoidRepeatedFailedGuess',{'avoidRepeatedFailedGuess':True}),'private-confirmation-attack-followup-comparison':('directCheckFollowup',{'directCheckFollowup':True}),'confirmed-ally-urgent-dispel-comparison':('urgentDispelBeforeAlly',{'urgentDispelBeforeAlly':True}),'net-base-turn-attack-reserve-comparison':('netAttackReserve',{'netAttackReserve':True}),'confirmed-enemy-break-repair-comparison':('enemyBreakRepair',{}),'claim-turn-commitment-comparison':('commitment',{'claimTurnCommitment':True}),'idle-manual-true-claim-mana-comparison':('idleClaimMana',{'idleClaimMana':True}),'forecast-attack-budget-comparison':('forecastAttackBudget',{'forecastAttackBudget':True}),'dead-ally-report-verification-comparison':('deadAllyReport',{'verifyDeadAllyReports':True})}
candidate,options=specs[d['kind']]
assert d['variants']==['baseline','control',candidate] and d['options']=={'baseline':{},'control':{},candidate:options}
if not a.allow_partial:assert d['complete'] and d['executions']==d['count']*4*3*4*3
if a.source_ref:
    files=subprocess.check_output(['git','ls-tree','-r','--name-only',a.source_ref,'packages/rules/src'],text=True).splitlines()
    expected_sources={x.removeprefix('packages/rules/') for x in files if x.endswith('.ts')}
else:expected_sources={'src/'+str(x.relative_to('packages/rules/src')) for x in pathlib.Path('packages/rules/src').rglob('*.ts')}
expected_sources|={'scripts/'+x for x in ['cooperative-claim-commitment.ts','cooperative-commitment-match.ts','league-runner.ts','baselines/pre-cooperative.ts','claim-opponents.ts']}
if d.get('persistence')=={'version':2}:expected_sources.add('scripts/cooperative-store.ts')
if d.get('comparisonRevision',0)>=2:
    expected_sources.add('scripts/baselines/pre-round024.ts')
    assert d['controlPolicy']==('PR-before-round024' if candidate=='enemyBreakRepair' else 'current-default')
expected_aux={'tools/verify-claim-commitment.py'}
if d.get('comparisonRevision',0)>=3:expected_aux.add('tools/run-cooperative-generations.py')
assert set(d['sourceHashes'])==expected_sources and set(d['auxiliarySourceHashes'])==expected_aux
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
                if k=='break_ally' and 'wrongBreaks' in r['safety']:
                    z=t['grading'];safety['wrongBreaks']+=int(z['breakTargetSide'] is None or z['breakTargetSide']==t['side'] or not z['breakKnownName'] or z['breakKnownName']!=z['breakTargetName'])
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
    if 'wrongBreaks' in r['safety']:assert r['safety']['wrongBreaks']==safety['wrongBreaks']
    assert res['turns']==len(r['turns']) and res['trueNameTurns']==sum(t['trueName'] for t in r['turns']) and res['trueNameBonusGross']==10*res['trueNameTurns']
    assert res['turnGainGross']==sum(t['gain'] for t in r['turns']) and res['incomingAllyManaGross']==10*sum(t['allies'] for t in r['turns'])
    assert res['holdingTrueNameTurns']==sum(t['holding'] and t['trueName'] for t in r['turns'])
    for t in r['turns']:assert t['gain']==20+10*t['allies']+10*t['trueName'] and t['gem'] in [0,1,2,3] and 0<=t['at']<=g['elapsedMs']
    b=out['variants'].setdefault(v,{}).setdefault(mode,{'games':0,'scoreSum':0,'unfinished':0,'earlyAttackFailures':0,'rejected':0,'resources':collections.Counter(),'safety':collections.Counter(),'skills':{}})
    b['games']+=1;b['scoreSum']+=score;b['unfinished']+=int(g['winner'] is None);b['earlyAttackFailures']+=g['stats']['current']['earlyAttackFailures'];b['rejected']+=g['stats']['current']['rejected'];b['safety'].update(r['safety'])
    b['resources'].update({k:z for k,z in res.items() if k!='skills'})
    for k,z in skills.items():b['skills'].setdefault(k,collections.Counter()).update(z)
    guard_counts=collections.Counter();guard_seen=set()
    for t in r.get('guardDecisions',[]):
        assert mode=='primordial' and v in ['control','knownCommanderGuardBeforeAlly'] and t['ownSide']==f['currentSide']
        assert 0<=t['at']<=g['elapsedMs'] and (t['player'],t['at']) not in guard_seen;guard_seen.add((t['player'],t['at']))
        skill,name={'consume':('consume_master_guard','eltas'),'kumarin':('kumarin_commander_guard','rael')}[t['character']]
        assert t['guardSkill']==skill and t['guardCost']==50 and t['usesLeft']==1 and t['ownMemoryEqual'] and t['ownRngEqual']
        assert t['knownName'] in [None,name] and (t['target'] is None)==(t['knownName'] is None)
        assert t['reserve']==max([0]+[a['cost'] for a in t['reservedAttacks']])
        for a1 in t['reservedAttacks']:assert a1['skill'] in ['attack','advanced_attack','supreme_attack','soen_chain_murder'] and 0<a1['cooldown']<=20000 and a1['cost']<=t['mana'] and a1['knownEnemy']
        ready=not t['passive'] and t['blocked'] is None and t['cooldown']==0 and t['mana']>=t['guardCost']
        original,chosen=t['originalAction'],t['chosenAction']
        reason='skill_unavailable' if not ready else 'identity_unconfirmed' if t['target'] is None else 'target_dead' if not t['targetAlive'] else 'not_ally' if t['knownSide']!=t['ownSide'] else 'target_invulnerable' if t['targetProtected'] else 'attack_reserve' if t['guardCost']>t['mana']-t['reserve'] else 'other_original_choice' if not original or original['type']!='skill' or original['skill']!='ally' else 'eligible'
        assert reason==t['reason'] and t['eligible']==(reason=='eligible')
        selected=bool(t['target'] and chosen=={'type':'skill','skill':skill,'target':t['target']});assert selected==t['selectedGuard']
        if chosen:
            actual=[z for z in r['actions'] if z['player']==t['player'] and z['at']==t['at'] and z['action']==chosen];assert len(actual)==1 and actual[0]['accepted']==t['accepted'] and actual[0]['beforeMana']==t['mana']
        else:assert t['accepted'] is None
        if selected:assert t['actualName'] is not None and t['actualSide'] in [1,2] and type(t['success']) is bool
        if v=='knownCommanderGuardBeforeAlly':
            if t['eligible']:assert selected and t['accepted'] and t['success'] and t['actualName']==name and t['actualSide']==t['ownSide']
            else:assert original==chosen
        else:assert original==chosen
        guard_counts['decisions']+=1;guard_counts['reason:'+reason]+=1;guard_counts['eligible']+=t['eligible']
        guard_counts['selectedAtEligible']+=t['eligible'] and selected
        guard_counts['successfulAtEligible']+=t['eligible'] and selected and t['success']
        guard_counts['wrongAtEligible']+=t['eligible'] and selected and (t['actualName']!=name or t['actualSide']!=t['ownSide'])
    if 'wrongEarlyGuards' in r['safety']:assert r['safety']['wrongEarlyGuards']==guard_counts['wrongAtEligible']
    if candidate=='knownCommanderGuardBeforeAlly':b.setdefault('commanderGuard',collections.Counter()).update(guard_counts)
    proof_seen=set()
    for t in r.get('ownAttackProofs',[]):
        proof,event=t['proof'],t['event'];key=(t['player'],proof['seq'])
        assert v=='learnOwnAttackOutcome' and key not in proof_seen;proof_seen.add(key)
        assert proof['seq']==event['seq']>proof['afterSeq'] and proof['at']==event['at']<=t['observedAt']<=g['elapsedMs']
        assert event['kind']==proof['kind'] and event['kind'] in ['attack.hit','attack.kill','attack.guarded']
        assert event['vis']['to']=='all' or event['vis']['to']=='players' and t['player'] in event['vis']['ids']
        assert event['data']['attacker']==proof['actor'] and event['data']['target']==proof['name']
        assert proof['skill'] in ['attack','advanced_attack','supreme_attack','soen_chain_murder']
        assert t['correct']==(t['actualName']==proof['name']) and t['correct']
        assert any(z['player']==t['player'] and z['at']==proof['at'] and z['accepted'] and z['character']==proof['actor'] and z['action']=={'type':'skill','skill':proof['skill'],'target':proof['target'],'name':proof['name']} for z in r['actions'])
        assert any(z['player']==t['player'] and z['seq']==proof['seq'] and z['target']==proof['target'] and z['name']==proof['name'] for z in r.get('outcomeOpportunities',[]))
    for t in r.get('outcomeOpportunities',[]):
        assert isinstance(t['knownBefore'],bool)
        assert any(z['player']==t['player'] and z['at']==t['at'] and z['accepted'] and z['action']=={'type':'skill','skill':t['skill'],'target':t['target'],'name':t['name']} for z in r['actions'])
    if candidate=='learnOwnAttackOutcome':
        opportunities=r.get('outcomeOpportunities',[]);proofs=r.get('ownAttackProofs',[])
        b.setdefault('ownAttackKnowledge',collections.Counter()).update({'successfulNamedOutcomes':len(opportunities),'unknownBeforeOutcomes':sum(not t['knownBefore'] for t in opportunities),'rememberedProofs':len(proofs),'wrongProofs':sum(not t['correct'] for t in proofs),'eligibleUnknownOutcomes':sum(not o['knownBefore'] and o['gameRunning'] and o['actorAlive'] and o['targetAlive'] for o in opportunities),'eligibleRememberedOutcomes':sum(not o['knownBefore'] and o['gameRunning'] and o['actorAlive'] and o['targetAlive'] for o in opportunities if any(t['player']==o['player'] and t['proof']['seq']==o['seq'] for t in proofs)),'newIdentityProofs':sum(not o['knownBefore'] for o in opportunities if any(t['player']==o['player'] and t['proof']['seq']==o['seq'] for t in proofs))})
    budget_seen=set();budget_counts=collections.Counter()
    for t in r.get('budgets',[]):
        plan=t['plan'];assert v=='forecastAttackBudget' and t['ownSide']==f['currentSide'] and t['targetSide']!=t['ownSide']
        assert 0<=t['at']<=g['elapsedMs'] and (t['player'],t['at']) not in budget_seen;budget_seen.add((t['player'],t['at']))
        assert 0<t['nextTurnInMs']<=plan['cooldownRemainingMs']<=20000 and 0<=t['mana']<plan['cost']<=min(t['maxMana'],t['mana']+t['preview'])
        assert 0<plan['manaToKeep']==max(0,plan['cost']-t['preview'])<=t['mana'] and plan['name']==t['knownTarget']
        attacks=['attack','advanced_attack','supreme_attack','soen_chain_murder'];assert plan['skill'] in attacks
        assert not t['skillPassive'] and t['skillUsesLeft']!=0 and t['legalName'] and not t['selfIncapacitated'] and not t['targetProtected']
        guards={'civil_war':{'kai':['arin'],'dantes':['kelhu']},'lidellut':{'kai':['arin']},'troll':{'chis':['satoshi','zwinra']}}.get(mode,{}).get(plan['name'],[])
        assert t['guards']==guards and set(guards)<=set(t['observedDead'])
        original,chosen=t['originalAction'],t['chosenAction'];assert t['changed']==(original!=chosen) and t['originalCost']>=0 and t['chosenCost']>=0
        assert not set(t['removedSkills'])&set(attacks)
        assert t['originalWouldBreakForecast']==bool(original and original['type']=='skill' and original['skill'] in t['removedSkills'])
        if t['originalWouldBreakForecast']:assert t['originalCost']>t['mana']-plan['manaToKeep']
        if chosen:
            assert any(z['player']==t['player'] and z['at']==t['at'] and z['action']==chosen and z['beforeMana']==t['mana'] and z['nominalMana']==t['chosenCost'] for z in r['actions'])
            assert chosen['type']!='skill' or chosen['skill'] in attacks+['break_ally'] or t['chosenCost']<=t['mana']-plan['manaToKeep']
        budget_counts['decisions']+=1;budget_counts['changed']+=t['changed'];budget_counts['chosenNull']+=chosen is None
        if t['originalWouldBreakForecast']:
            budget_counts['originalBudgetBreaking']+=1;budget_counts['originalSkill:'+original['skill']]+=1
    if candidate=='forecastAttackBudget':b.setdefault('budget',collections.Counter()).update(budget_counts)
    dead_seen=set();dead_counts=collections.Counter()
    for t in r.get('deadReports',[]):
        assert v=='deadAllyReport' and t['ownSide']==f['currentSide'] and not t['targetKnown'] and t['senders']
        assert 0<=t['at']<=g['elapsedMs'] and (t['player'],t['at']) not in dead_seen;dead_seen.add((t['player'],t['at']))
        for sender in t['senders']:assert not sender['alive'] and sender['revealed']==sender['name'] and sender['side']==t['ownSide'] and 0<=sender['reportAt']<=t['at']
        chosen=t['chosenAction'];assert chosen['type']=='skill' and chosen['target']==t['target'] and chosen['skill'] in ['advanced_scan','scan','ally_scan','enemy_scan','troll_scan','troll_ally_scan','troll_enemy_scan','truth_gem']
        assert t['changed']==(t['originalAction']!=chosen) and any(z['player']==t['player'] and z['at']==t['at'] and z['action']==chosen and z['nominalMana']==t['nominalMana'] for z in r['actions'])
        dead_counts['decisions']+=1;dead_counts['changed']+=t['changed'];dead_counts['nominalMana']+=t['nominalMana']
    if candidate=='deadAllyReport':b.setdefault('deadReports',collections.Counter()).update(dead_counts)
    reaction_seen=set()
    for t in r.get('checkReactions',[]):
        assert v=='directCheckFollowup' and t['ownSide']==f['currentSide'] and t['knownSide']!=t['ownSide'] and t['knownName']==t['name']
        assert (t['player'],t['seq']) not in reaction_seen;reaction_seen.add((t['player'],t['seq']))
        assert 1000<=t['at']-t['receivedAt']<=5000 and t['at']<=g['elapsedMs'] and t['seq']>0
        assert 0<t['activity']<t['inactiveDraw']<=1 and t['originalAction'] is None
        e=t['event'];assert e['kind'] in ['inspect.result','gem.result'] and e['at']==t['receivedAt'] and e['seq']==t['seq']
        assert e['vis']=={'to':'players','ids':[t['player']]} and any(f.get('character')==t['name'] and f['player']==t['target'] and not f.get('oneOf') for f in e['facts'])
        assert t['actualTargetName'] is not None and t['actualTargetSide'] in [1,2]
        assert t['chosenAction']['type']=='skill' and t['chosenAction']['skill'] in ['attack','advanced_attack','supreme_attack','soen_chain_murder'] and t['chosenAction']['target']==t['target'] and t['chosenAction']['name']==t['name']
        assert any(z['player']==t['player'] and z['at']==t['at'] and z['action']==t['chosenAction'] for z in r['actions'])
    if 'wrongFollowups' in r['safety']:assert r['safety']['wrongFollowups']==sum(t['actualTargetName']!=t['name'] or t['actualTargetSide']==t['ownSide'] for t in r.get('checkReactions',[]))
    if candidate=='directCheckFollowup':b.setdefault('checkReactions',collections.Counter()).update({'changed':len(r.get('checkReactions',[]))})
    rescues=r.get('rescues',[]);rescue_seen=set()
    for t in rescues:
        assert v=='urgentDispelBeforeAlly' and mode=='primordial' and t['ownSide']==t['knownSide']==f['currentSide'] and t['knownName']
        assert (t['player'],t['at']) not in rescue_seen;rescue_seen.add((t['player'],t['at']))
        assert 'incapacitated' in t['beforeStatuses'] and 'invulnerable' not in t['beforeStatuses']
        assert t['originalAction']['type']=='skill' and t['originalAction']['skill']=='ally' and t['chosenAction']=={'type':'skill','skill':'tachin_neutralize','target':t['target']}
        assert t['changed'] and t['accepted'] and t['afterStatuses']==[]
        assert any(z['player']==t['player'] and z['at']==t['at'] and z['action']==t['chosenAction'] and z['accepted'] for z in r['actions'])
    if candidate=='urgentDispelBeforeAlly':b.setdefault('rescues',collections.Counter()).update({'changed':len(rescues)})
    blocked_guesses=r.get('blockedGuesses',[])
    for t in blocked_guesses:
        assert v==candidate=='avoidRepeatedFailedGuess' and t['chosenAction'] is None and t['knownName'] is None and t['level']>1
        act=t['originalAction'];e=t['failureEvent'];assert act['type']=='skill' and act['skill']=='advanced_attack' and act['name'] in t['candidates'] and len(t['candidates'])<=2
        assert 0<=t['previousFailureAt']<t['at']<=g['elapsedMs'] and e['at']==t['previousFailureAt'] and e['kind']=='attack.fail.self'
        assert e['vis']['to']=='players' and e['vis']['ids']==[t['player']] and e['data']['target']==act['target'] and e['data']['name']==act['name']
        assert t['skillCost']==50 and t['skillBlocked'] is None and t['ownMemoryEqual'] and t['ownRngEqual']
        assert not any(a['player']==t['player'] and a['at']==t['at'] and a['action']['type']!='chat' for a in r['actions'])
    if candidate=='avoidRepeatedFailedGuess':b.setdefault('blockedGuesses',collections.Counter()).update({'blocked':len(blocked_guesses)})
    reported_attacks=r.get('reportedAttacks',[])
    for t in reported_attacks:
        assert v==candidate=='reportedFirstWarning' and t['knownName'] is None and t['level']==1 and t['mana']>=100 and t['at']==t['elapsedMs']>=240000 and not t['lastSameFailure']
        act=t['chosenAction'];assert act=={'type':'skill','skill':'advanced_attack','target':t['target'],'name':t['name']} and t['changed']==(act!=t['originalAction']) and t['senders']
        target_id=int(t['target'].removeprefix('p'));assert t['targetSeat']==(f['count']+1-target_id if f['reversed'] else target_id)
        for sender in t['senders']:
            e=sender['event'];assert sender['alive'] and sender['side']==t['ownSide']==f['currentSide'] and sender['id']!=t['player']
            assert e['kind'] in ['chat.whisper','chat.ally'] and e['vis']['to']=='players' and t['player'] in e['vis']['ids'] and e['data']['from']==sender['id'] and e['at']<=t['at']
            assert e['data']['text']==f"확인 정보: [{t['targetSeat']}] {t['nameLabel']}" and not e.get('facts')
        actual=[a for a in r['actions'] if a['player']==t['player'] and a['at']==t['at'] and a['action']==act];assert len(actual)==1 and actual[0]['accepted']==t['accepted']
        assert t['actualName'] is not None and t['actualSide'] in [1,2] and type(t['attackFailure']) is bool
    if 'wrongReportedAttacks' in r['safety']:assert r['safety']['wrongReportedAttacks']==sum(t['actualName']!=t['name'] or t['actualSide']==t['ownSide'] for t in reported_attacks)
    if candidate=='reportedFirstWarning':b.setdefault('reportedAttacks',collections.Counter()).update({'attempted':len(reported_attacks),'changed':sum(t['changed'] for t in reported_attacks),'attackFailure':sum(t['attackFailure'] for t in reported_attacks)})

assert out['executions']==d['executions']
for v,modes in out['variants'].items():
    for mode,b in modes.items():b['score']=b['scoreSum']/b['games']
    if not a.allow_partial:assert len(fixture_sets[v])==d['count']*4*3*4 and set(modes)=={'civil_war','primordial','lidellut','troll'}
if not a.allow_partial:
    assert fixture_sets['baseline']==fixture_sets['control']==fixture_sets[candidate]
    for left,right in [(candidate,'control'),(candidate,'baseline')]:
        values=[sum(scores[left][s])/len(scores[left][s])-sum(scores[right][s])/len(scores[right][s]) for s in range(d['start'],d['start']+d['count'])]
        rng=random.Random(0x475354);means=sorted(sum(rng.choices(values,k=len(values)))/len(values) for _ in range(10000))
        difference,interval=sum(values)/len(values),[means[250],means[9749]]
        if d.get('comparisonRevision',0)>=3:
            assert d['design']['arithmetic']=='exactHalfPointSeedTotalsBeforeNormalization'
            per_seed=len(scores[left][d['start']]);assert all(len(scores[v][seed])==per_seed for v in d['variants'] for seed in range(d['start'],d['start']+d['count']))
            units=[sum(scores[left][seed])-sum(scores[right][seed]) for seed in range(d['start'],d['start']+d['count'])]
            difference,interval=exact_seed_contrast(units,per_seed)
        out['contrasts'][left+'-'+right]={'difference':difference,'seedBootstrap95':interval,'byMode':{m:out['variants'][left][m]['score']-out['variants'][right][m]['score'] for m in out['variants'][left]}}
    safe=not any(sum(b['safety'].values())+b['earlyAttackFailures'] for b in out['variants'][candidate].values())
    out['developmentGatePassed']=safe and out['contrasts'][candidate+'-control']['difference']>0 and out['contrasts'][candidate+'-baseline']['difference']>=0
    c=out['contrasts'][candidate+'-baseline'];out['holdoutGatePassed']=d['phase']=='holdout' and safe and c['seedBootstrap95'][0]>0 and min(c['byMode'].values())>=-.02
if a.journal_path:
    raw=read(a.journal_path);assert hashlib.sha256(raw).hexdigest()==d['journalSha256'];lines=raw.splitlines();header=json.loads(lines.pop(0));assert header['fingerprint']==d['fingerprint'] and header['meta']==meta
    assert [json.loads(line) for line in lines]==d['records'];out['journalVerified']=True
if d.get('persistence')=={'version':2}:
    assert a.journal_path,'v2 verification requires journal'
    base=str(a.path).removesuffix('.gz').removesuffix('.json')
    publication=json.loads(pathlib.Path(base+'.publication.json').read_text())
    assert publication=={'version':2,'fingerprint':d['fingerprint'],'executions':d['executions'],'complete':d['complete'],'snapshotSHA256':hashlib.sha256(read(a.path)).hexdigest(),'journalSHA256':hashlib.sha256(read(a.journal_path)).hexdigest()}
    out['publicationVerified']=True
print(json.dumps(out,ensure_ascii=False,indent=2))
