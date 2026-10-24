"""Independent capped-game own-decision/protection witness and immutable export audit."""
import collections,gzip,hashlib,json,pathlib,subprocess,sys

def read(path):
    raw=pathlib.Path(path).read_bytes()
    return gzip.decompress(raw) if str(path).endswith('.gz') else raw
def enc(value):return json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()
def sha(value):return hashlib.sha256(value).hexdigest()

def own_view(view,actor,at):
    assert view['me']['id']==actor and view['me']['alive'] and view['phase']=='running' and view['elapsedMs']==at
    for p in view['players']:assert not {'mana','character','flags','skills','extraLives'}&set(p)
def own_events(events,actor):
    for e in events:assert e['vis']['to']=='all' or e['vis']['to']=='players' and actor in e['vis']['ids']
def memory(wire,actor):
    assert set(wire)=={'$gstMap'} and len(wire['$gstMap'])==1 and wire['$gstMap'][0][0]==actor
    return wire['$gstMap'][0][1]

def validate(row,original,selection):
    assert row['newResearchExecutions']==0 and row['wholeGameMatched'] and row['fixture']==original['fixture'] and row['game']==original['game']
    assert row['variant']==original['variant'] and row['style']==original['style']
    assert row['matchedActions']==len(original['actions']) and row['actionsSHA256']==sha(enc(original['actions']))
    assert row['memoryTraceSHA256']==original['memoryTraceSHA256'] and row['originalRecordSHA256']==sha(enc(original))
    assert row['inputId']==selection['inputId'] and row['key']==row['inputId']+'/'+row['originalRecordSHA256']
    roles={r['id']:r for r in original['roles']};counts=collections.Counter()
    calls=row['calls'];assert calls['primary']==calls['activePrimary']+calls['inactivePrimary'] and calls['activePrimary']==len(row['decisions'])
    counts.update(calls);previous_at=-1;chosen_ordinals=[];by_actor={}
    for d in row['decisions']:
        assert d['stage']=='primary' and d['at']>=previous_at;previous_at=d['at'];own_view(d['view'],d['actor'],d['at']);own_events(d['events'],d['actor'])
        pre=memory(d['preMemory'],d['actor']);post=memory(d['postMemory'],d['actor']);assert post['perception']['lastElapsedMs']==d['at']
        assert d['persistedKnownAfter']==post['perception']['known']['$gstMap']
        assert d['nominallyReadySkills']==[s['key'] for s in d['view']['me']['skills'] if not s['passive'] and s['blocked'] is None]
        current=roles[d['actor']]['side']==original['fixture']['currentSide'] or row['identicalPolicy']
        assert d['knowledgeScope']==('current-policy-own-update' if current and original['variant']!='baseline' else 'observer-reconstruction-from-legacy-own-memory')
        for target,name in d['persistedKnownAfter']:
            counts['persistedKnownObservations']+=1;counts['wrongPersistedKnown']+=roles[target]['character']!=name
        for target,name in d['reconstructedKnownAfter']:
            counts['reconstructedKnownObservations']+=1;counts['wrongReconstructedKnown']+=roles[target]['character']!=name
        for target,names in d['reconstructedCandidatesAfter']:
            counts['candidateSetObservations']+=1;counts['truthAbsentCandidates']+=roles[target]['character'] not in names
        cell=by_actor.setdefault(d['actor'],{'character':roles[d['actor']]['character'],'side':roles[d['actor']]['side'],'active':0,'null':0,'chosen':collections.Counter(),'nominallyReady':collections.Counter()})
        cell['active']+=1;cell['nominallyReady'].update(d['nominallyReadySkills'])
        if d['chosenAction'] is None:cell['null']+=1;counts['activeNull']+=1
        else:
            ordinal=d['ordinal'];a=original['actions'][ordinal];chosen_ordinals.append(ordinal)
            assert (a['player'],a['at'],a['stage'],a['action'])==(d['actor'],d['at'],'primary',d['chosenAction'])
            cell['chosen'][a['action'].get('skill',a['action']['type'])]+=1
    assert chosen_ordinals==[i for i,a in enumerate(original['actions']) if a['stage']=='primary'], 'Missing or duplicate actual primary choice'
    expected=[i for i,a in enumerate(original['actions']) if a['action']['type']=='skill' and a['action'].get('target') and set(a['receiptKinds'])&{'attack.guarded','skill.holy_binding.purge','skill.destroyer_guidance.madness'}]
    assert [p['ordinal'] for p in row['protection']]==expected
    for p in row['protection']:
        a=original['actions'][p['ordinal']];assert (p['actor'],p['at'],p['action'],p['accepted'])==(a['player'],a['at'],a['action'],a['accepted'])
        own_view(p['ownView'],p['actor'],p['at']);own_events(p['ownEvents'],p['actor']);assert p['externalGradingOnly'] is True
        for x in [p['externalTargetBefore'],p['externalTargetAfter']]:
            role=roles[a['action']['target']];assert (x['id'],x['character'],x['side'])==(role['id'],role['character'],role['side'])
            assert isinstance(x['mana'],(int,float)) and x['mana']>=0
        kinds={e['kind'] for e in p['ownEvents']};assert kinds.issubset(set(a['receiptKinds']))
        if 'attack.guarded' in a['receiptKinds']:
            assert 'attack.guarded' in kinds;before,after=p['externalTargetBefore'],p['externalTargetAfter']
            if original['fixture']['mode']=='troll':
                assert before['character']=='deka' and before['mana']>=25 and after['mana']==before['mana']-25
                assert before['alive'] and after['alive'] and before['extraLives']==after['extraLives'];counts['trollPaidGuards']+=1
            counts['guards']+=1
        for kind,label in [('skill.holy_binding.purge','purges'),('skill.destroyer_guidance.madness','restorations')]:
            if kind in a['receiptKinds']:assert kind in kinds;counts[label]+=1
    return {'counts':dict(counts),'actors':by_actor,'unfinished':original['game']['winner'] is None}

def verify(path,journal,publication,manifest_path,partial=False):
    raw,jb,pb=map(read,[path,journal,publication]);data=json.loads(raw);pub=json.loads(pb);manifest_text=pathlib.Path(manifest_path).read_bytes();manifest=json.loads(manifest_text)
    assert data['kind']=='own-failure-stalemate-replay' and data['newResearchExecutions']==0
    assert manifest==data['manifest'] and sha(manifest_text)==data['manifestSHA256']
    meta={k:v for k,v in data.items() if k not in ['fingerprint','executions','expectedReplays','complete','records','journalSha256']}
    assert data['fingerprint']==sha(enc(meta));lines=jb.splitlines()
    assert json.loads(lines[0])==dict(type='header',fingerprint=data['fingerprint'],meta=meta)
    assert [json.loads(x) for x in lines[1:]]==data['records'] and data['journalSha256']==sha(jb)
    assert pub==dict(version=2,fingerprint=data['fingerprint'],executions=data['executions'],complete=data['complete'],snapshotSHA256=sha(raw),journalSHA256=sha(jb))
    for p,h in data['sourceHashes'].items():assert h==sha(subprocess.check_output(['git','show',data['sourceRef']+':packages/rules/'+p]))
    for p,h in data['verificationHashes'].items():assert h==sha(subprocess.check_output(['git','show',data['sourceRef']+':'+p]))
    sources={}
    for source in manifest['sources']:
        content=read(pathlib.Path(manifest_path).parent/source['path']);assert sha(content)==source['sha256'];original=json.loads(content);assert original['complete'] and original['sourceRef']==source['sourceRef'];sources[source['id']]=original
    assert len(data['records'])==data['executions']<=data['expectedReplays']==len(manifest['selected'])
    assert partial or data['complete'] and data['executions']==data['expectedReplays']
    rows=[];totals=collections.Counter()
    for row,selection in zip(data['records'],manifest['selected']):
        source=sources[selection['inputId']];originals=[r for r in source['records'] if r['fixture']==selection['fixture'] and r['style']==selection['style'] and r['variant']==selection['variant']]
        assert len(originals)==1 and sha(enc(originals[0]))==selection['recordSHA256'];assert row['identicalPolicy']==(source['kind']=='own-failure-faction-identical-policy')
        result=validate(row,originals[0],selection);totals.update(result['counts']);rows.append({'inputId':row['inputId'],'fixture':row['fixture'],'variant':row['variant'],'style':row['style'],**result})
    return dict(kind=data['kind'],sourceRef=data['sourceRef'],complete=data['complete'],replayedGames=data['executions'],newResearchExecutions=0,totals=totals,rows=rows,rawSHA256=sha(raw),journalSHA256=sha(jb),limitations=['Selected capped games and paired policies are failure diagnostics, not population estimates.','Activity-gate and nominal readiness do not establish target-specific legal alternative opportunities.','Target resources are external grading after choice; legacy reconstructed knowledge is not asserted to be its exact decision belief.'])

if __name__=='__main__':
    result=verify(*sys.argv[1:5],partial='--partial' in sys.argv[6:]);pathlib.Path(sys.argv[5]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['complete','replayedGames','newResearchExecutions','totals']}))
