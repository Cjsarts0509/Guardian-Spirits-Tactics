"""Independent same-policy faction audit. No pooled policy-strength score is emitted."""
import collections, importlib.util, json, pathlib, subprocess, sys

_spec=importlib.util.spec_from_file_location('failure_record',pathlib.Path(__file__).with_name('verify-failure-development.py'))
_record=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(_record)
read,enc,sha,ci=_record.read,_record.enc,_record.sha,_record.ci
MODES=['civil_war','primordial','lidellut','troll']
VARIANTS=['baseline','control','candidate']
SCRIPTS=['failure-development.ts','failure-selfplay.ts','failure-selfplay-run.ts','sender-development.ts','sender-arbitration-witness.ts','cooperative-store.ts','league-runner.ts','baselines/pre-cooperative.ts','claim-opponents.ts']
VERIFIERS=['tools/verify-failure-development.py','tools/verify-failure-selfplay.py','tools/test-failure-selfplay.py']
OPTIONS={'baseline':{},'control':{'verifyIncomingAllies':'commander-report-first','rememberOwnDelayedCheck':True},'candidate':{'verifyIncomingAllies':'commander-report-first','rememberOwnDelayedCheck':True,'learnOwnDelayedFailureFaction':True}}
DESIGN=dict(unit='seed',fixedOpponent=False,identicalPolicySelfplay=True,playerCount='8+(seed-start)%5',balancedPlayerCounts=True,orders=2,currentSide=1,controllerRelabelIsDuplicate=True,skillValuesChanged=False,promotionEvidence=False)

def resources(actions):
 return dict(nominalSkillMana=sum(a['nominalMana'] for a in actions if a['accepted'] and a['action']['type']=='skill'),netSkillManaDelta=sum(a['afterMana']-a['beforeMana'] for a in actions if a['accepted'] and a['action']['type']=='skill'),attackFailures=sum('attack.fail.self' in a['receiptKinds'] for a in actions),rejected=sum(not a['accepted'] for a in actions),reports=sum(bool(a['reportTarget']) for a in actions),falseReports=sum(bool(a['reportTarget']) and (a['reportedName']!=a['reportActual'] or a['reportKnown']!=a['reportActual']) for a in actions))

def validate_row(row):
 assert row['style']=='identical-policy' and row['fixture']['currentSide']==1
 intake=_record.validate(row)
 assert row['resourcesBySide']=={str(s):resources([a for a in row['actions'] if a['side']==s]) for s in [1,2]}
 assert row['resources']==row['resourcesBySide']['1']
 return intake

def side1score(row):
 return .5 if row['game']['winner'] is None else int(row['game']['winner']==1)

def bucket():
 return dict(games=0,side1Wins=0,side2Wins=0,unfinished=0,seedScores=collections.defaultdict(list),resourcesBySide={'1':collections.Counter(),'2':collections.Counter()},behavior=collections.Counter(),intake=collections.Counter(),followups=collections.Counter(),acceptedReportsBySide={'1':collections.Counter(),'2':collections.Counter()})

def finish(cell):
 scores=[sum(x)/len(x) for x in cell.pop('seedScores').values()]
 cell['seeds']=len(scores);cell['side1Score']=sum(scores)/len(scores) if scores else None
 cell['seedBootstrap95']=ci(scores) if len(scores)>1 else None
 return cell

def verify(path,journal,publication,partial=False):
 raw,jb,pb=map(read,[path,journal,publication]);data=json.loads(raw);pub=json.loads(pb)
 assert data['kind']=='own-failure-faction-identical-policy' and data['phase']=='balance-development'
 assert data['variants']==VARIANTS and data['options']==OPTIONS and data['design']==DESIGN
 assert data['optionsSHA256']==sha(enc(OPTIONS)) and data['count']>0 and data['count']%5==0
 assert data['settings']=={'tickMs':250,'activity':.012,'limitMs':5400000}
 meta={k:v for k,v in data.items() if k not in ['fingerprint','executions','complete','records','journalSha256']}
 assert data['fingerprint']==sha(enc(meta));lines=jb.splitlines()
 assert json.loads(lines[0])==dict(type='header',fingerprint=data['fingerprint'],meta=meta)
 assert [json.loads(x) for x in lines[1:]]==data['records'] and data['journalSha256']==sha(jb)
 assert pub==dict(version=2,fingerprint=data['fingerprint'],executions=data['executions'],complete=data['complete'],snapshotSHA256=sha(raw),journalSHA256=sha(jb))
 sources={x.removeprefix('packages/rules/') for x in subprocess.check_output(['git','ls-tree','-r','--name-only',data['sourceRef'],'packages/rules/src'],text=True).splitlines() if x.endswith('.ts')}|{'scripts/'+p for p in SCRIPTS}
 assert set(data['sourceHashes'])==sources and set(data['verificationHashes'])==set(VERIFIERS)
 for p,h in data['sourceHashes'].items():assert h==sha(subprocess.check_output(['git','show',data['sourceRef']+':packages/rules/'+p]))
 for p,h in data['verificationHashes'].items():assert h==sha(subprocess.check_output(['git','show',data['sourceRef']+':'+p]))
 assert data['executions']==len(data['records']) and (partial or data['complete'] and data['executions']==data['count']*24)
 expected=[(m,seed,rev,v) for m in MODES for seed in range(data['start'],data['start']+data['count']) for rev in [False,True] for v in VARIANTS]
 found=[];pairs={};by_mode={};by_count={};by_order={};compositions={};roles_summary={}
 for row in data['records']:
  f=row['fixture'];v=row['variant'];key=(f['mode'],f['seed'],f['reversed'],v)
  assert key not in pairs and key in expected and f['count']==8+(f['seed']-data['start'])%5 and type(f['reversed']) is bool
  pairs[key]=row;found.append(key);intake=validate_row(row)
  cells=[by_mode.setdefault(f'{v}/{f["mode"]}',bucket()),by_count.setdefault(f'{v}/{f["mode"]}/{f["count"]}',bucket()),by_order.setdefault(f'{v}/{f["mode"]}/{f["reversed"]}',bucket())]
  for cell in cells:
   cell['games']+=1;cell['side1Wins']+=row['game']['winner']==1;cell['side2Wins']+=row['game']['winner']==2;cell['unfinished']+=row['game']['winner'] is None
   cell['seedScores'][f['seed']].append(side1score(row));cell['behavior'].update(row['counters']);cell['intake'].update(intake)
   for side in ['1','2']:cell['resourcesBySide'][side].update(row['resourcesBySide'][side])
   cell['followups'].update(kind for _,kind in {(a['ordinal'],a['kind']) for a in row['followups'] if a['knownName'] is not None})
   for a in row['actions']:
    if a['accepted'] and a['reportTarget']:
     report=cell['acceptedReportsBySide'][str(a['side'])];report['total']+=1;report['wrongName']+=a['reportedName']!=a['reportActual'];report['unsupportedByOwnWorkingKnowledge']+=a['reportedName']!=a['reportKnown']
  composition={str(side):sorted(r['character'] for r in row['roles'] if r['side']==side) for side in [1,2]};ckey=f'{f["mode"]}/{f["count"]}'
  observed=compositions.setdefault(ckey,{})
  signature=json.dumps(composition,sort_keys=True);entry=observed.setdefault(signature,{'rolesBySide':composition,'gamesByPolicy':collections.Counter()});entry['gamesByPolicy'][v]+=1
  survivors={p['character']:p['alive'] for p in row['game']['survivors']}
  for r in row['roles']:
   cell=roles_summary.setdefault(f'{v}/{f["mode"]}/{f["count"]}/{r["character"]}',dict(side=r['side'],appearances=0,survived=0,factionWon=0,skills={}))
   cell['appearances']+=1;cell['survived']+=survivors[r['character']];cell['factionWon']+=row['game']['winner']==r['side']
   for a in row['actions']:
    if a['player']!=r['id'] or a['action']['type']!='skill':continue
    skill=cell['skills'].setdefault(a['action']['skill'],dict(attempts=0,accepted=0,attackFailures=0,acceptedNominalMana=0))
    skill['attempts']+=1;skill['accepted']+=a['accepted'];skill['attackFailures']+='attack.fail.self' in a['receiptKinds'];skill['acceptedNominalMana']+=a['nominalMana'] if a['accepted'] else 0
 assert found==expected[:len(found)]
 if data['complete']:assert found==expected
 contrasts={};paths=collections.Counter()
 for mode in MODES:
  contrasts[mode]={}
  for reference in ['control','baseline']:
   diffs=[];to_side1=to_side2=same=0
   for seed in range(data['start'],data['start']+data['count']):
    keys=[(mode,seed,rev) for rev in [False,True]]
    if not all((*k,'candidate') in pairs and (*k,reference) in pairs for k in keys):continue
    values=[]
    for key in keys:
     a,b=pairs[*key,'candidate'],pairs[*key,reference];delta=side1score(a)-side1score(b);values.append(delta);to_side1+=delta>0;to_side2+=delta<0;same+=delta==0
     if reference=='control':
      paths['pairs']+=1;equal=all(a[k]==b[k] for k in ['game','actions','resourcesBySide','memoryTraceSHA256']);paths['identicalGameActionsResourcesMemory']+=equal
      if mode!='troll':assert equal;paths['outsideTrollCompared']+=1
    diffs.append(sum(values)/2)
   contrasts[mode][reference]=dict(seeds=len(diffs),side1MeanChange=sum(diffs)/len(diffs) if diffs else None,seedBootstrap95=ci(diffs) if len(diffs)>1 else None,shiftedToSide1=to_side1,shiftedToSide2=to_side2,unchanged=same)
 for dest in [by_mode,by_count,by_order]:
  for key,value in dest.items():finish(value)
 return dict(kind=data['kind'],sourceRef=data['sourceRef'],start=data['start'],count=data['count'],executions=data['executions'],complete=data['complete'],byMode=by_mode,byCount=by_count,byOrder=by_order,compositions={k:list(v.values()) for k,v in compositions.items()},roles=roles_summary,contrasts=contrasts,paths=paths,snapshotSHA256=sha(raw),journalSHA256=sha(jb),promotionEvidence=False,limitations=['Synthetic same-policy faction balance, not a policy strength comparison or human validation.','Player-count changes also change role composition. Role survival is not faction win rate.','A controller relabel is a duplicate and is excluded. No pooled policy50% evidence.','Repeated knowledge checks and within-seed order variants are not independent identities or seeds.','Paired faction shifts do not establish a single skill-value cause.'])

if __name__=='__main__':
 result=verify(*sys.argv[1:4],partial='--partial' in sys.argv);pathlib.Path(sys.argv[4]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:result[k] for k in ['executions','complete','paths','snapshotSHA256']}))
