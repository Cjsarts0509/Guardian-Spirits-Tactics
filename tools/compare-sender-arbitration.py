"""Post-hoc paired own-input audit; no hidden roles and no policy tuning."""
import gzip,hashlib,json,pathlib,sys
def read(p):
 b=pathlib.Path(p).read_bytes()
 return gzip.decompress(b) if p.endswith('.gz') else b
def sha(b):return hashlib.sha256(b).hexdigest()
oldb,newb=map(read,sys.argv[1:3])
assert sha(oldb)=='92274255bc35dc8faf6e3c6b2fb871b036a2e97d48ddf4ba57a4ca15457c6b85'
assert sha(newb)=='e1815dda1b6c4340f6ca8cfd24f96d886bd46bac053a030d55beadc1716b9ea5'
old,new=map(json.loads,[oldb,newb]);assert old['candidateOptions']=={'verifyIncomingAllies':'commander-report'} and new['candidateOptions']=={'verifyIncomingAllies':'commander-report-first'}
assert old['actualCandidateGames']==new['actualCandidateGames']==0
assert len(old['records'])==len(new['records'])==4
counts=dict(sameOwnInputs=0,sameChosenAction=0,samePreRng=0,sameAlternativeAfterRng=0,unchangedAlternatives=0,changedAlternatives=0,resourceProposals=0,ordinaryReportCompetes=0,selectedArbitration=0,upperPriorityPreserved=0,sourceRecordActionsMatched=0)
changes=[];preserved=[]
for a,b in zip(old['records'],new['records']):
 assert a['fixture']==b['fixture'] and a['variant']==b['variant'] and a['game']==b['game'] and a['actionsSHA256']==b['actionsSHA256'] and a['matchedActions']==b['matchedActions']
 counts['sourceRecordActionsMatched']+=b['matchedActions'];assert len(a['decisions'])==len(b['decisions'])
 for x,y in zip(a['decisions'],b['decisions']):
  for key in ['player','at','beforeAppliedActions','view','events','known','candidates','intel']:assert x[key]==y[key]
  counts['sameOwnInputs']+=1;assert x['chosenAction']==y['chosenAction'];counts['sameChosenAction']+=1
  assert x['preRng']==y['preRng'];counts['samePreRng']+=1
  assert x['alternativeAfterRng']==y['alternativeAfterRng'];counts['sameAlternativeAfterRng']+=1
  for key,value in x['diagnostic'].items():assert value==y['diagnostic'][key]
  diag=y['diagnostic'];counts['resourceProposals']+=diag['proposal'] is not None
  counts['ordinaryReportCompetes']+=diag['ordinaryReportCompetes']
  if x['alternative']!=y['alternative']:
   counts['changedAlternatives']+=1;assert x['alternative']==y['chosenAction']==diag['priorTrustedVerification'] and y['alternative']==diag['proposal'] and diag['ordinaryReportCompetes']
   counts['selectedArbitration']+=1
   changes.append(dict(fixture=b['fixture'],variant=b['variant'],at=y['at'],player=y['player'],before=x['alternative'],after=y['alternative'],beforeMana=y['probe']['beforeMana'],afterMana=y['probe']['afterMana'],ownDirectReceipt=y['probe']['ownEvents'],knownAfter=y['probe']['knownAfter'],trustedReportsAfter=y['probe']['trustedReportsAfter']))
  else:
   counts['unchangedAlternatives']+=1
   if diag['proposal'] is not None and y['alternative']!=diag['proposal']:
    counts['upperPriorityPreserved']+=1;preserved.append(dict(fixture=b['fixture'],variant=b['variant'],at=y['at'],action=y['alternative']))
result=dict(kind='round054-paired-own-stage-audit',oldSHA256=sha(oldb),newSHA256=sha(newb),sourceSHA256=sha(pathlib.Path(__file__).read_bytes()),counts=counts,changes=changes,preserved=preserved,limitations=['The two changes repeat one seed/seat situation under two policies, not two independent trials.','No real candidate full game or causal protection/win evidence; own direct identity remains distinct from trusted report.'])
pathlib.Path(sys.argv[3]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(counts))
