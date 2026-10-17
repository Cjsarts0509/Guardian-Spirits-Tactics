"""Post hoc timing description only; no new match or policy selection."""
from pathlib import Path
import json,gzip,hashlib,sys
base,quality,out=map(Path,sys.argv[1:4]);raw=base.read_bytes();raw=gzip.decompress(raw)if base.suffix=='.gz'else raw;d=json.loads(raw);q=json.load(open(quality));assert hashlib.sha256(raw).hexdigest()==q['snapshotSHA256'];rows=[]
for f in q['firstDivergences']:
 key=f['fixtureKey'];r=next(x['result']for x in d['records']if x['variant']=='control' and [x['mode'],x['style'],x['result']['game']['fixture']['seed'],x['result']['game']['fixture']['reversed'],x['result']['game']['fixture']['currentSide']]==key)
 old=next((a for a in r['actions']if a['at']>=f['at'] and a['player']==f['player'] and a['action']==f['candidateAction']),None)
 rows.append({'fixtureKey':key,'player':f['player'],'action':f['candidateAction'],'candidateFirstGuardAt':f['at'],'controlGuardAt':old['at']if old else None,'earlierMs':old['at']-f['at']if old else None,'controlAccepted':old['accepted']if old else None})
out.write_text(json.dumps({'sourceSHA256':q['snapshotSHA256'],'analysisSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'researchExecutions':0,'records':rows,'limitation':'Timing on diverged paired trajectories; no causal win contribution claim.'},ensure_ascii=False,indent=2)+'\n')
