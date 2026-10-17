"""Descriptive actual follow-up only; no model, threshold or mode selection."""
import collections,gzip,hashlib,json,pathlib,sys
p=pathlib.Path(sys.argv[1]);raw=p.read_bytes();d=json.loads(gzip.decompress(raw) if p.suffix=='.gz' else raw)
assert d['complete'] and d['kind']=='forecast-attack-budget-comparison'
pairs={}
for x in d['records']:
    f=x['result']['game']['fixture'];key=(x['mode'],x['style'],f['seed'],f['reversed'],f['currentSide'])
    pairs.setdefault(key,{})[x['variant']]=x['result']
counts=collections.Counter();changed=[]
for key,vs in pairs.items():
    r=vs['forecastAttackBudget'];episodes=set()
    for b in r['budgets']:
        counts['decisions']+=1;episodes.add((b['player'],b['at']+b['nextTurnInMs']))
        if not b['changed']:continue
        traces={}
        for v in ['control','forecastAttackBudget']:
            traces[v]=[a for a in vs[v]['actions'] if a['player']==b['player'] and b['at']<=a['at']<=b['at']+60000 and a['action']['type']=='skill']
        changed.append({'fixture':dict(zip(['mode','style','seed','reversed','currentSide'],key)),'budget':b,'actualFollowUp60s':traces})
    counts['ownTurnEpisodes']+=len(episodes)
out={'format':1,'executions':d['executions'],'counts':counts,'changed':changed,'windowMs':60000,
    'rawSHA256':hashlib.sha256(raw).hexdigest(),'analysisSourceSHA256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),
    'promotionEvidence':False,'limitations':['Multiple decision records can describe the same own-turn episode.','Follow-up actions are descriptive diverged paths, not independent causal trials.']}
print(json.dumps(out,ensure_ascii=False,indent=2))
