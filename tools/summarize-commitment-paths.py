"""Describe actual action paths; no candidate or mode selection."""
import collections, gzip, hashlib, json, pathlib, sys
p=pathlib.Path(sys.argv[1]);raw=p.read_bytes();d=json.loads(gzip.decompress(raw) if p.suffix=='.gz' else raw)
assert d['complete'] and d['kind']=='claim-turn-commitment-comparison'
records={}
for x in d['records']:
    f=x['result']['game']['fixture'];k=(x['mode'],x['style'],f['seed'],f['reversed'],f['currentSide']);records.setdefault(k,{})[x['variant']]=x['result']
def score(r):return .5 if r['game']['winnerPolicy'] is None else float(r['game']['winnerPolicy']=='current')
def actions(r):return [{k:t[k] for k in ['player','at','action','accepted','error','beforeMana','afterMana','character']} for t in r['actions']]
groups={}
for key,variants in records.items():
    a,b=variants['control'],variants['commitment'];aa,bb=actions(a),actions(b)
    for name in ['overall',key[0]]:
        g=groups.setdefault(name,collections.Counter());g['pairs']+=1;g['better' if score(b)>score(a) else 'worse' if score(b)<score(a) else 'sameWinner']+=1
        g['exactActionPaths']+=aa==bb;g['exactGameResults']+=a['game']==b['game']
totals={}
for v in d['variants']:
    stats=collections.Counter();skills=collections.defaultdict(collections.Counter)
    for x in d['records']:
        if x['variant']!=v:continue
        r=x['result'];stats.update({k:z for k,z in r['resources'].items() if k!='skills'})
        for k,z in r['resources']['skills'].items():skills[k].update(z)
    totals[v]={'resources':stats,'skills':skills}
out={'format':1,'kind':'descriptive-commitment-paths','executions':d['executions'],'groups':groups,'totals':totals,
    'rawSHA256':hashlib.sha256(raw).hexdigest(),'analysisSourceSHA256':hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),
    'policySelection':False,'promotionEvidence':False,'limitations':['Action-path equality excludes evaluator holding/grading fields.','Resource totals follow diverged actual paths and do not hold future survival fixed.']}
print(json.dumps(out,ensure_ascii=False,indent=2))
