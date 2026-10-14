"""Pre-registered eight-cell learner for one truthful claim intervention."""
import collections, gzip, hashlib, itertools, json, pathlib, random, sys

CELL_KEYS=['C%dG%dT%d'%bits for bits in itertools.product([0,1],repeat=3)]
SETTINGS={'features':['commander','unfinishedGem','nearTurn43s'],'cells':8,'minPairs':24,'minSeeds':8,'bootstrapSamples':10000,'bootstrapSeed':0x475354,'selection':'seed95LowerPositive'}

def cell_for(point):
    v=point['before']
    cell='C%dG%dT%d'%(int(v['commander']),int(v['gem']<3),int(v['nextTurnInMs']<=43000))
    if point['cell']!=cell:raise ValueError('self-view cell mismatch')
    return cell

def score(game):
    return .5 if game['winnerPolicy'] is None else float(game['winnerPolicy']=='current')

def fit(data):
    if data['kind']!='first-false-claim-single-intervention' or data['phase']!='training-diagnostic' or not data['complete']:raise ValueError('complete training data required')
    if data['learning']!=SETTINGS:raise ValueError('pre-registered learner settings changed')
    samples={k:collections.defaultdict(list) for k in CELL_KEYS}
    for row in data['rows']:
        for pair in row['pairs']:
            a,b=pair['control'],pair['truthful'];p=a['point']
            if p is None:continue
            if not p['accepted'] or not b['point']['accepted']:raise ValueError('intervention receipt rejected')
            cell=cell_for(p)
            if cell_for(b['point'])!=cell:raise ValueError('paired features differ')
            samples[cell][pair['fixture']['seed']].append(score(b['game'])-score(a['game']))
    cells={}
    for key,blocks in samples.items():
        pairs=sum(map(len,blocks.values()))
        values=[sum(x)/len(x) for _,x in sorted(blocks.items())]
        row={'pairs':pairs,'seeds':len(values),'difference':sum(values)/len(values) if values else None,'seedBootstrap95':None,'action':'keep'}
        if pairs<SETTINGS['minPairs'] or len(values)<SETTINGS['minSeeds']:row['reason']='insufficient_pairs_or_seeds'
        else:
            rng=random.Random(SETTINGS['bootstrapSeed'])
            means=sorted(sum(rng.choices(values,k=len(values)))/len(values) for _ in range(SETTINGS['bootstrapSamples']))
            row['seedBootstrap95']=[means[250],means[9749]]
            row['reason']='positive_seed_lower_bound' if means[250]>0 else 'positive_lower_bound_not_proven'
            if means[250]>0:row['action']='true-name'
        cells[key]=row
    chosen=[k for k,v in cells.items() if v['action']=='true-name']
    return {'format':1,'kind':'first-claim-eight-cell-model','status':'candidate' if chosen else 'no_action_change_candidate',
      'trainingStart':data['start'],'trainingSeeds':data['count'],'trainingExecutions':data['executions'],
      'settings':SETTINGS,'truthfulCells':chosen,'cells':cells,'promotionEvidence':False,
      'limitations':['One selected public player and one forced claim per paired game.','All-player deployment needs separate fresh development and holdout.']}

def main():
    p=pathlib.Path(sys.argv[1]);raw=p.read_bytes();data=json.loads(gzip.decompress(raw) if p.suffix=='.gz' else raw)
    result=fit(data);result['trainingRawSHA256']=hashlib.sha256(raw).hexdigest();result['learnerSHA256']=hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest()
    print(json.dumps(result,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
