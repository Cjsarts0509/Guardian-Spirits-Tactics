"""Independent death census using the proven047 validator through a lossless schema adapter."""
import collections,gzip,hashlib,importlib.util,json,pathlib,subprocess,sys
p=pathlib.Path(__file__).with_name('verify-commander-death-replay.py')
spec=importlib.util.spec_from_file_location('commander_validator',p);legacy=importlib.util.module_from_spec(spec);spec.loader.exec_module(legacy)
def read(path):
    raw=pathlib.Path(path).read_bytes();return gzip.decompress(raw) if str(path).endswith('.gz') else raw
def enc(value):return json.dumps(value,ensure_ascii=False,separators=(',',':')).encode()
def sha(value):return hashlib.sha256(value).hexdigest()
def validate(row,original,selection):
    assert row['newResearchExecutions']==0 and row['identicalPolicy'] and row['fixture']['mode']=='primordial'
    actual_hash=sha(enc(original));assert row['originalRecordSHA256']==row['policyResultSHA256']==actual_hash==selection['recordSHA256']
    assert row['memoryTraceSHA256']==original['memoryTraceSHA256'] and row['style']==original['style']
    assert row['inputId']==selection['inputId'] and row['key']==row['inputId']+'/'+actual_hash
    # The old checker expects game/actions nested under result. All values are preserved.
    # Authenticate the real complete record above; only the adapter's own digest is re-encoded.
    adapter={'variant':original['variant'],'roles':original['roles'],'result':{'game':original['game'],'actions':original['actions']}}
    compatibility_row={**row,'originalRecordSHA256':sha(enc(adapter)),'policyResultSHA256':sha(enc(adapter))}
    counts,ready=legacy.validate_row(compatibility_row,adapter)
    counts['games']+=1;counts['winner:'+str(row['winner'])]+=1;counts['matchedActions']+=row['receipts']
    return {'counts':counts,'ownReadySkillRowsAtDeath':ready}

def verify(path,journal,publication,manifest_path,partial=False):
    raw,jb,pb=map(read,[path,journal,publication]);data=json.loads(raw);pub=json.loads(pb);manifest_text=pathlib.Path(manifest_path).read_bytes();manifest=json.loads(manifest_text)
    assert data['kind']=='own-failure-commander-death-replay' and data['newResearchExecutions']==0
    assert manifest['kind']=='failure-commander-death-selection' and manifest['newResearchExecutions']==0
    assert len({(s['inputId'],s['recordSHA256']) for s in manifest['selected']})==len(manifest['selected'])
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
        content=read(pathlib.Path(manifest_path).parent/source['path']);assert sha(content)==source['sha256'];original=json.loads(content);assert original['complete'] and original['sourceRef']==source['sourceRef']
        assert original['kind']=='own-failure-faction-identical-policy' and original['executions']==len(original['records'])==original['count']*24
        assert original['optionsSHA256']==sha(enc(original['options']))
        for p,h in original['sourceHashes'].items():
            if p.startswith('src/'):assert data['sourceHashes'][p]==h
        assert source['id'] not in sources;sources[source['id']]=original
    assert len(data['records'])==data['executions']<=data['expectedReplays']==len(manifest['selected'])
    assert data['complete']==(data['executions']==data['expectedReplays'])
    assert partial or data['complete'] and data['executions']==data['expectedReplays']
    rows=[];totals=collections.Counter();buckets={}
    for row,selection in zip(data['records'],manifest['selected']):
        source=sources[selection['inputId']];originals=[r for r in source['records'] if r['fixture']==selection['fixture'] and r['style']==selection['style'] and r['variant']==selection['variant']]
        assert len(originals)==1 and sha(enc(originals[0]))==selection['recordSHA256'];assert row['identicalPolicy'] and source['kind']=='own-failure-faction-identical-policy'
        result=validate(row,originals[0],selection);totals.update(result['counts'])
        for count in [0,row['fixture']['count']]:
            cell=buckets.setdefault(row['inputId']+'/'+row['variant']+'/'+str(count),{'counts':collections.Counter(),'ownReadySkillRowsAtDeath':collections.Counter()});cell['counts'].update(result['counts']);cell['ownReadySkillRowsAtDeath'].update(result['ownReadySkillRowsAtDeath'])
        rows.append({'inputId':row['inputId'],'fixture':row['fixture'],'variant':row['variant'],'style':row['style'],**result})
    return dict(kind=data['kind'],sourceRef=data['sourceRef'],complete=data['complete'],replayedGames=data['executions'],newResearchExecutions=0,totals=totals,byInputVariantCount=buckets,rows=rows,rawSHA256=sha(raw),journalSHA256=sha(jb),limitations=['Existing identical-policy replays, no new independent research games.','Ready skill rows at death are not earlier legal rescue opportunities or prevented deaths.','All hidden protection and actual deaths are evaluator-only, never policy input.','Cause frequencies do not identify a causal skill balance intervention.'])

if __name__=='__main__':
    result=verify(*sys.argv[1:5],partial='--partial' in sys.argv[6:]);pathlib.Path(sys.argv[5]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['complete','replayedGames','newResearchExecutions','totals']}))
