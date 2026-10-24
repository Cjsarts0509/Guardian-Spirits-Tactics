"""Independent original-command, recipient-private evidence and replay-export audit."""
import collections, gzip, hashlib, json, pathlib, subprocess, sys

def read(path):
    raw=pathlib.Path(path).read_bytes()
    return gzip.decompress(raw) if str(path).endswith('.gz') else raw

def enc(value): return json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()
def sha(value): return hashlib.sha256(value).hexdigest()

def own_snapshot(snapshot,recipient,at):
    view=snapshot['view']
    assert view['me']['id']==recipient and view['me']['alive'] and view['phase']=='running' and view['elapsedMs']==at
    for player in view['players']: assert not {'mana','character','flags','skills','extraLives'}&set(player)
    for event in snapshot['events']:
        assert event['vis']['to']=='all' or event['vis']['to']=='players' and recipient in event['vis']['ids']
    for label in ['preMemory','postMemory']:
        wire=snapshot[label];assert set(wire)=={'$gstMap'} and len(wire['$gstMap'])==1 and wire['$gstMap'][0][0]==recipient

def validate(row,original,selection):
    assert row['newResearchExecutions']==0 and row['wholeGameMatched'] and row['fixture']==original['fixture']
    assert row['variant']==original['variant']=='candidate' and row['style']==original['style']
    assert row['matchedActions']==len(original['actions']) and row['actionsSHA256']==sha(enc(original['actions']))
    assert row['memoryTraceSHA256']==original['memoryTraceSHA256'] and row['originalRecordSHA256']==sha(enc(original))
    assert row['inputId']==selection['inputId'] and row['key']==row['inputId']+'/'+row['originalRecordSHA256']
    assert [r['ordinal'] for r in row['reports']]==selection['ordinals']
    roles={r['id']:r for r in original['roles']};totals=collections.Counter()
    for report in row['reports']:
        ordinal=report['ordinal'];command=original['actions'][ordinal];action=command['action'];event=report['event']
        assert command['accepted'] and action['type']=='chat' and action['channel']=='whisper'
        assert (report['sender'],report['recipient'],report['target'],report['name'],report['at'])==(command['player'],action['to'],command['reportTarget'],command['reportedName'],command['at'])
        assert report['name']==command['reportKnown']==roles[report['target']]['character']
        assert any(p['actor']==report['sender'] and p['at']<=report['at'] and p['ordinal']<=ordinal and [report['target'],report['name']] in p['newExact'] for p in original['probes'])
        assert event['kind']=='chat.whisper' and event['at']==report['at'] and event['data']=={'from':report['sender'],'to':report['recipient'],'channel':'whisper','text':action['text']}
        assert event['vis']['to']=='players' and report['sender'] in event['vis']['ids'] and report['recipient'] in event['vis']['ids']
        alive=next(p['alive'] for p in original['game']['survivors'] if p['character']==roles[report['recipient']]['character'])
        assert report['recipientAliveAtEnd']==alive
        consumed=report['firstConsumed'];classification='consumed' if consumed else 'ended-without-consumption' if alive else 'dead-by-end-without-consumption'
        assert report['classification']==classification;totals['acceptedReports']+=1;totals[classification]+=1
        if consumed:
            own_snapshot(consumed,report['recipient'],consumed['at']);assert consumed['at']>=report['at']
            assert event in consumed['events'] and consumed['after']['storedReport']=={'character':report['name'],'at':report['at'],'seq':event['seq']}
            invariant=consumed['isolatedReportKnowledgeInvariant']
            assert invariant['known'] is True and invariant['candidates'] is True
            assert invariant['withReportKnown']==invariant['withoutReportKnown'] and invariant['withReportCandidates']==invariant['withoutReportCandidates']
            if consumed['chosenAction']:
                chosen=original['actions'][consumed['ordinal']]
                assert chosen['action']==consumed['chosenAction'] and chosen['player']==report['recipient'] and chosen['at']==consumed['at'] and chosen['stage']==consumed['stage']
            after=consumed['after'];totals['isolatedReportNoFactPromotion']+=1
            totals['unknownSenderAtConsumption']+=after['workingKnownSender'] is None
            totals['trustedAtConsumption']+=after['trustedName']==report['name']
            totals['targetAlreadyKnownAtConsumption']+=after['workingKnownTarget']==report['name']
            totals['receivedTargetStillUnknown']+=after['workingKnownTarget'] is None
            totals['sumConsumptionDelayMs']+=consumed['at']-report['at']
        times=[]
        for transition in report['transitions']:
            own_snapshot(transition,report['recipient'],transition['at']);assert transition['at']>=report['at'];times.append(transition['at'])
            assert transition['storedKnownTarget'] in [None,roles[report['target']]['character']]
            assert transition['workingKnownTarget'] in [None,roles[report['target']]['character']]
            assert transition['workingKnownSender'] in [None,roles[report['sender']]['character']]
        assert times==sorted(times)
        follow=[]
        for i,a in enumerate(original['actions']):
            if i<=ordinal or a['player']!=report['recipient'] or a['action']['type']!='skill' or a['action'].get('target') not in [report['target'],report['sender']]:continue
            follow.append((i,a))
        assert len(report['actions'])==len(follow)
        for witness,(i,a) in zip(report['actions'],follow):
            assert witness['ordinal']==i and witness['at']==a['at'] and witness['action']==a['action'] and witness['accepted']==a['accepted'] and witness['receiptKinds']==a['receiptKinds']
            target=a['action']['target'];assert witness['relation']==('reported-target' if target==report['target'] else 'report-sender')
            assert witness['knownAtChoice'] in [None,roles[target]['character']]
            totals['recipientTargetActions']+=target==report['target'];totals['recipientSenderActions']+=target==report['sender']
            totals['acceptedRecipientTargetActions']+=target==report['target'] and a['accepted']
    return totals

def verify(path,journal,publication,manifest_path,partial=False):
    raw,jb,pb=map(read,[path,journal,publication]);data=json.loads(raw);pub=json.loads(pb)
    assert data['kind']=='own-failure-report-reception-replay' and data['newResearchExecutions']==0
    manifest_text=pathlib.Path(manifest_path).read_bytes();manifest=json.loads(manifest_text)
    assert manifest==data['manifest'] and sha(manifest_text)==data['manifestSHA256']
    meta={k:v for k,v in data.items() if k not in ['fingerprint','executions','expectedReplays','complete','records','journalSha256']}
    assert data['fingerprint']==sha(enc(meta));lines=jb.splitlines()
    assert json.loads(lines[0])==dict(type='header',fingerprint=data['fingerprint'],meta=meta)
    assert [json.loads(line) for line in lines[1:]]==data['records'] and data['journalSha256']==sha(jb)
    assert pub==dict(version=2,fingerprint=data['fingerprint'],executions=data['executions'],complete=data['complete'],snapshotSHA256=sha(raw),journalSHA256=sha(jb))
    for p,h in data['sourceHashes'].items():assert h==sha(subprocess.check_output(['git','show',data['sourceRef']+':packages/rules/'+p]))
    sources={}
    for source in manifest['sources']:
        original_raw=read(pathlib.Path(manifest_path).parent/source['path']);assert sha(original_raw)==source['sha256']
        original=json.loads(original_raw);assert original['complete'] and original['sourceRef']==source['sourceRef']
        sources[source['id']]=original
    assert len(data['records'])==data['executions']<=data['expectedReplays']==len(manifest['selected'])
    assert partial or data['complete'] and data['executions']==data['expectedReplays']
    totals=collections.Counter();by_input={}
    for row,selection in zip(data['records'],manifest['selected']):
        source=sources[selection['inputId']]
        originals=[r for r in source['records'] if r['fixture']==selection['fixture'] and r['style']==selection['style'] and r['variant']==selection['variant']]
        assert len(originals)==1 and sha(enc(originals[0]))==selection['recordSHA256']
        assert row['identicalPolicy']==(source['kind']=='own-failure-faction-identical-policy')
        counts=validate(row,originals[0],selection);totals.update(counts);by_input.setdefault(selection['inputId'],collections.Counter()).update(counts)
    return dict(kind=data['kind'],sourceRef=data['sourceRef'],complete=data['complete'],replayedGames=data['executions'],newResearchExecutions=0,totals=totals,byInput=by_input,
                sourceSHA256=sha(raw),journalSHA256=sha(jb),publicationSHA256=sha(pb),limitations=['Selected existing games are replays, not new independent trials.','Recipient action links are temporal, not causal report benefit.','Unconsumed dead-by-end cases do not identify exact death/result ordering.'])

if __name__=='__main__':
    result=verify(*sys.argv[1:5],partial='--partial' in sys.argv[6:])
    pathlib.Path(sys.argv[5]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False))
