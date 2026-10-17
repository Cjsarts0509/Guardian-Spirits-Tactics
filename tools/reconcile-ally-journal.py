"""Recover unchanged game records from consistent snapshot/journal union; never resolve conflicts."""
import argparse,gzip,hashlib,json,os,pathlib,tempfile
p=argparse.ArgumentParser();p.add_argument('path',type=pathlib.Path);p.add_argument('--journal-path',type=pathlib.Path,required=True);p.add_argument('--lineage',type=pathlib.Path,required=True);p.add_argument('--archive-prefix',type=pathlib.Path);p.add_argument('--batch-log',type=pathlib.Path);a=p.parse_args()
def sha(b):return hashlib.sha256(b).hexdigest()
snapshot=a.path.read_bytes();journal=a.journal_path.read_bytes();d=json.loads(snapshot);lines=journal.splitlines();h=json.loads(lines[0]);meta={k:v for k,v in d.items() if k not in ['fingerprint','complete','executions','journalSha256','rows']}
encode=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()
assert h=={'type':'header','fingerprint':d['fingerprint'],'meta':meta} and sha(encode(meta))==d['fingerprint']
games={};snap_keys=set();journal_keys=set()
def add(mode,style,variant,result,keys):
    f=result['game']['fixture'];assert f['mode']==mode and mode in ['civil_war','primordial','lidellut','troll'] and style in ['truthful','bluff','skill-aware-bluff'] and variant in ['control','delay']
    assert d['start']<=f['seed']<d['start']+d['count'] and f['count']==8+(f['seed']-d['start'])%5 and type(f['reversed']) is bool and f['currentSide'] in [1,2]
    k=(mode,style,f['seed'],f['reversed'],f['currentSide'],variant);assert k not in keys;keys.add(k)
    if k in games:assert games[k]==result,('conflicting_game_record',k)
    else:games[k]=result
for row in d['rows']:
    for pair in row['pairs']:
        for v in ['control','delay']:
            if v in pair:add(row['mode'],row['style'],v,pair[v],snap_keys)
for line in lines[1:]:
    x=json.loads(line);assert x['type']=='game';add(x['mode'],x['style'],x['variant'],x['result'],journal_keys)
assert d['executions']==len(snap_keys)
rows=[];new_lines=[encode(h)];rank_mode={x:i for i,x in enumerate(['civil_war','primordial','lidellut','troll'])};rank_style={x:i for i,x in enumerate(['truthful','bluff','skill-aware-bluff'])}
ordered=sorted(games,key=lambda k:(rank_mode[k[0]],rank_style[k[1]],k[2],k[3],k[4],['control','delay'].index(k[5])))
pairs={};row_index={}
for k in ordered:
    mode,style,seed,rev,side,v=k;r=games[k];rk=(mode,style)
    if rk not in row_index:row_index[rk]={'mode':mode,'style':style,'pairs':[]};rows.append(row_index[rk])
    pk=k[:5]
    if pk not in pairs:pairs[pk]={'fixture':r['game']['fixture']};row_index[rk]['pairs'].append(pairs[pk])
    pairs[pk][v]=r;new_lines.append(encode({'type':'game','mode':mode,'style':style,'variant':v,'result':r}))
target=d['count']*4*3*4*2;assert len(games)<=target
new_journal=b'\n'.join(new_lines)+b'\n';d.update(rows=rows,executions=len(games),complete=len(games)==target,journalSha256=sha(new_journal));new_snapshot=json.dumps(d,ensure_ascii=False,indent=2).encode()
def atomic(path,b):
    fd,name=tempfile.mkstemp(prefix=path.name+'.recover-',dir=path.parent)
    try:
        with os.fdopen(fd,'wb') as f:f.write(b);f.flush();os.fsync(f.fileno())
        os.replace(name,path)
    finally:
        if os.path.exists(name):os.unlink(name)
if a.archive_prefix:
    for label,b in [('snapshot.json.gz',snapshot),('journal.ndjson.gz',journal)]:
        q=pathlib.Path(str(a.archive_prefix)+'-'+label);assert not q.exists();atomic(q,gzip.compress(b,mtime=0))
event={'beforeSnapshotSHA256':sha(snapshot),'beforeJournalSHA256':sha(journal),'snapshotGames':len(snap_keys),'journalGames':len(journal_keys),'overlapIdenticalGames':len(snap_keys&journal_keys),'snapshotOnlyGames':len(snap_keys-journal_keys),'journalOnlyGames':len(journal_keys-snap_keys),
       'uniqueUnionGames':len(games),'afterSnapshotSHA256':sha(new_snapshot),'afterJournalSHA256':sha(new_journal),'recordFieldsChanged':False,'complete':d['complete']}
if a.batch_log:event['batchLog']=a.batch_log.read_text()
lineage=json.loads(a.lineage.read_text()) if a.lineage.exists() else {'format':1,'sourceRef':'38a57879a3ba358e33d4e8a4cac0b10b7eb6b2b4','recoveryToolSHA256':sha(pathlib.Path(__file__).read_bytes()),'events':[],'promotionEvidence':False}
assert lineage['recoveryToolSHA256']==sha(pathlib.Path(__file__).read_bytes());lineage['events'].append(event)
atomic(a.journal_path,new_journal);atomic(a.path,new_snapshot);atomic(a.lineage,json.dumps(lineage,ensure_ascii=False,indent=2).encode());print(json.dumps(event,ensure_ascii=False))
