import pathlib,json,gzip,hashlib,collections,argparse
p=argparse.ArgumentParser();p.add_argument('raw',type=pathlib.Path);p.add_argument('verified',type=pathlib.Path);p.add_argument('out',type=pathlib.Path);p.add_argument('--source-ref',required=True);a=p.parse_args()
b=a.raw.read_bytes();d=json.loads(gzip.decompress(b) if a.raw.suffix=='.gz' else b);v=json.loads(a.verified.read_bytes());assert d['complete'] and v['complete'] and d['fingerprint']==v['fingerprint'] and d['executions']==v['executions']
candidate=d['variants'][-1];results={}
for name,modes in v['variants'].items():
 results[name]={'score':sum(x['scoreSum'] for x in modes.values())/sum(x['games'] for x in modes.values()),'byMode':{m:x['score'] for m,x in modes.items()},'unfinished':sum(x['unfinished'] for x in modes.values()),'safety':sum(sum(x['safety'].values()) for x in modes.values()),'earlyAttackFailures':sum(x['earlyAttackFailures'] for x in modes.values())}
pairs=collections.defaultdict(dict)
for x in d['records']:
 f=x['result']['game']['fixture'];key=(x['mode'],x['style'],f['seed'],f['reversed'],f['currentSide']);pairs[key][x['variant']]=x['result']
changes=[];winDiff=collections.Counter();actionsChanged=0
score=lambda x:.5 if x['game']['winnerPolicy'] is None else int(x['game']['winnerPolicy']=='current')
for key,x in pairs.items():
 l=x[candidate];r=x['control'];changed=l['actions']!=r['actions'];actionsChanged+=changed
 delta=score(l)-score(r);winDiff['better' if delta>0 else 'worse' if delta<0 else 'tied']+=1
 if changed:changes.append({'key':key,'gameChanged':l['game']!=r['game'],'scoreDifference':delta,'rescues':l.get('rescues',[])})
out={'kind':'completed-development-summary','sourceRef':a.source_ref,'executions':d['executions'],'fingerprint':d['fingerprint'],'policySHA256':d['sourceHashes']['src/bot.ts'],'options':d['options'],'optionsSHA256':hashlib.sha256(json.dumps(d['options'],ensure_ascii=False,separators=(',',':')).encode()).hexdigest(),'results':results,'contrasts':v['contrasts'],'developmentGatePassed':v['developmentGatePassed'],'holdoutUsed':False,'pairedGames':len(pairs),'actionsChanged':actionsChanged,'pairedScores':dict(winDiff),'changes':changes,'rescueCount':sum(len(x['result'].get('rescues',[])) for x in d['records']),'newResearchExecutions':0,'promotionEvidence':False,'rawFileSHA256':hashlib.sha256(b).hexdigest(),'verifiedSHA256':hashlib.sha256(a.verified.read_bytes()).hexdigest(),'summaryToolSHA256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()}
a.out.parent.mkdir(parents=True,exist_ok=True);a.out.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:out[k] for k in ['executions','results','developmentGatePassed','pairedScores','actionsChanged','rescueCount']},ensure_ascii=False))
