"""Post-hoc paired prefix check, including same-action RNG intervention signals."""
import gzip,hashlib,json,pathlib,sys
p=pathlib.Path(sys.argv[1]);blob=gzip.decompress(p.read_bytes()) if str(p).endswith('.gz') else p.read_bytes();d=json.loads(blob)
def key(r):
 f=r['fixture'];return f['mode'],r['style'],f['seed'],f['reversed'],f['currentSide']
pairs={(key(r),r['variant']):r for r in d['records']};rows=[]
for (k,v),r in pairs.items():
 if v!='candidate':continue
 c=pairs[k,'control'];signals=[x for x in r['decisions'] if x['changed'] or x['originalAfterRng']!=x['chosenAfterRng']];same=all(r[x]==c[x] for x in ['game','actions','resources'])
 first=signals[0] if signals else None
 prefix=True if first is None else r['actions'][:first['ordinal']]==c['actions'][:first['ordinal']]
 if first is None:assert same,('unexplained path difference',k)
 else:assert prefix,('path differs before recorded policy/RNG signal',k)
 rows.append(dict(fixture=r['fixture'],style=r['style'],sameFullGameActionsResources=same,signalCount=len(signals),firstSignal=None if first is None else dict(at=first['at'],ordinal=first['ordinal'],player=first['player'],changed=first['changed'],sameActionDifferentRng=not first['changed'],original=first['originalAction'],chosen=first['chosenAction'],originalAfterRng=first['originalAfterRng'],chosenAfterRng=first['chosenAfterRng']),prefixBeforeFirstSignalMatched=prefix))
result=dict(kind='round055-paired-prefix-policy-and-rng-audit',snapshotSHA256=hashlib.sha256(blob).hexdigest(),analysisSourceSHA256=hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),pairs=len(rows),sameWhole=sum(r['sameFullGameActionsResources'] for r in rows),withSignal=sum(r['signalCount']>0 for r in rows),sameActionRngFirst=sum(r['firstSignal'] is not None and r['firstSignal']['sameActionDifferentRng'] for r in rows),prefixMatched=sum(r['prefixBeforeFirstSignalMatched'] for r in rows),rows=rows,limitations=['A matching prefix and observed policy/RNG signal establishes where paths separate, not a causal attribution of eventual wins to one particular followup.'])
pathlib.Path(sys.argv[2]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['rows','limitations']}))
