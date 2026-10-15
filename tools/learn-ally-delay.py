"""Pre-registered four-cell rule for one low-mana confirmed-ally delay."""
import collections,gzip,hashlib,itertools,json,pathlib,random,sys
SETTINGS={'features':['knownEnemy','afterManaLessThan20'],'cells':4,'minPairs':48,'minSeeds':16,'bootstrapSamples':10000,'bootstrapSeed':0x475354,'selection':'seed99LowerPositive'}
def cell_for(p):
    v=p['before'];c='E%dL%d'%(int(v['knownEnemy']),int(v['afterMana']<20))
    if p['cell']!=c:raise ValueError('own-view cell mismatch')
    return c
def score(g):return .5 if g['winnerPolicy'] is None else float(g['winnerPolicy']=='current')
def fit(d):
    if d['kind']!='first-low-mana-confirmed-ally-single-delay' or d['phase']!='training-diagnostic' or not d['complete'] or d['learning']!=SETTINGS:raise ValueError('complete preregistered training required')
    samples={'E%dL%d'%x:collections.defaultdict(list) for x in itertools.product([0,1],repeat=2)};safe=True
    for row in d['rows']:
        for pair in row['pairs']:
            a,b=pair['control'],pair['delay'];safe&=not any(sum(x['safety'].values())+x['game']['stats']['current']['earlyAttackFailures'] for x in [a,b])
            if a['point'] is None:continue
            c=cell_for(a['point'])
            if cell_for(b['point'])!=c:raise ValueError('paired cells differ')
            samples[c][pair['fixture']['seed']].append(score(b['game'])-score(a['game']))
    cells={}
    for c,blocks in samples.items():
        n=sum(map(len,blocks.values()));values=[sum(x)/len(x) for _,x in sorted(blocks.items())]
        r={'pairs':n,'seeds':len(values),'difference':sum(values)/len(values) if values else None,'seedBootstrap99':None,'action':'keep'}
        if n<48 or len(values)<16:r['reason']='insufficient_pairs_or_seeds'
        elif not safe:r['reason']='safety_failed'
        else:
            rng=random.Random(0x475354);means=sorted(sum(rng.choices(values,k=len(values)))/len(values) for _ in range(10000));r['seedBootstrap99']=[means[50],means[9949]]
            r['reason']='positive_seed_lower_bound' if means[50]>0 else 'positive_lower_bound_not_proven'
            if means[50]>0:r['action']='delay-once'
        cells[c]=r
    chosen=[c for c,r in cells.items() if r['action']=='delay-once']
    return {'format':1,'kind':'first-ally-four-cell-model','status':'candidate' if chosen else 'no_action_change_candidate','trainingStart':d['start'],'trainingSeeds':d['count'],'trainingExecutions':d['executions'],
      'settings':SETTINGS,'delayCells':chosen,'cells':cells,'safetyPassed':safe,'promotionEvidence':False,
      'limitations':['One public selected player and one skipped ally proposal.','Fresh all-player development and independent holdout remain required.','Rejected original proposals are retained; no hidden post-treatment selection.']}
def main():
    p=pathlib.Path(sys.argv[1]);raw=p.read_bytes();d=json.loads(gzip.decompress(raw) if p.suffix=='.gz' else raw);out=fit(d)
    out['trainingRawSHA256']=hashlib.sha256(raw).hexdigest();out['learnerSHA256']=hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest();print(json.dumps(out,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
