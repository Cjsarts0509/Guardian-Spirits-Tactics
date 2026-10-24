"""Post-hoc descriptive followup ledger. Never returns evidence to a policy."""
import collections,gzip,hashlib,json,pathlib,sys
p=pathlib.Path(sys.argv[1]);blob=gzip.decompress(p.read_bytes()) if str(p).endswith('.gz') else p.read_bytes();d=json.loads(blob);result={}
for r in d['records']:
 v=r['variant'];cell=result.setdefault(v,dict(counts=collections.Counter(),byMode={},episodes=[]))
 cell['counts']['activeChoices']+=r['counters']['activeChoices']
 cell['counts']['reportMotivatedChoices']+=len(r['decisions'])
 cell['counts']['publiclyEligibleIncomingChoices']+=sum(bool(x['diagnostic']['incoming']) for x in r['decisions'])
 cell['counts']['resourceFeasibleProposals']+=sum(x['diagnostic']['proposal'] is not None for x in r['decisions'])
 cell['counts']['selectedMatches']+=sum(x['selected'] for x in r['decisions'])
 cell['counts']['changedChoices']+=sum(x['changed'] for x in r['decisions'])
 cell['counts']['sameActionDifferentRngChoices']+=sum(not x['changed'] and x['originalAfterRng']!=x['chosenAfterRng'] for x in r['decisions'])
 aa=[x for x in r['actions'] if x['side']==r['fixture']['currentSide'] and x['grade']['reportTarget'] is not None]
 cell['counts']['actualReports']+=len(aa)
 cell['counts']['truthWrongReports']+=sum(x['grade']['reportedName']!=x['grade']['reportActualName'] for x in aa)
 cell['counts']['missingStoredKnownProofReports']+=sum(x['grade']['reportKnownName'] is None for x in aa)
 cell['counts']['contradictedStoredKnownReports']+=sum(x['grade']['reportKnownName'] is not None and x['grade']['reportKnownName']!=x['grade']['reportActualName'] for x in aa)
 for i,e in enumerate(r['episodes']):
  decision=r['decisions'][e['decision']];receipt=decision['receipt'];known=dict(receipt['knownAfter']);after=dict(receipt['trustedReportsAfter']);before=dict(decision['diagnostic']['trustedReports'])
  exact=any(f.get('player')==e['sender'] and f.get('character')==e['immediateKnown'] and e['immediateKnown'] is not None for ev in receipt['ownEvents'] for f in ev.get('facts',[]))
  new_trusted=[t for t in e['reports'] if t['target'] not in known and after.get(t['target'])==t['name'] and before.get(t['target'])!=t['name']]
  links=[x for x in r['followups'] if x['episode']==i];confirmed_links=[x for x in links if x['senderKnownName'] is not None]
  row=dict(fixture=r['fixture'],style=r['style'],actor=e['actor'],sender=e['sender'],at=e['at'],changed=decision['changed'],immediateKnown=e['immediateKnown'],exactIdentityReceipt=exact,memoryObservedAt=e['memoryObservedAt'],newTrustedCommanderTargets=new_trusted,targetDirectlyObserved=e['targetObserved'],confirmedSenderFollowupLinks=len(confirmed_links),confirmedSenderReportConsistentActions=len({(x['ordinal'],x['kind'],x['target']) for x in confirmed_links if x['kind'].startswith('report_consistent_')}))
  cell['episodes'].append(row)
  c=collections.Counter(acceptedSelectedAttempts=1,immediateConfirmed=e['immediateKnown'] is not None,exactIdentityReceipts=exact,constraintConfirmed=e['immediateKnown'] is not None and not exact,directPerceptionMemoryObserved=e['memoryObservedAt'] is not None,episodesWithLaterConfirmedKnowledgeUse=bool(confirmed_links),newTrustedCommanderTargetLinks=len(new_trusted),episodesOpeningTrustedCommanderRoute=bool(new_trusted),episodesWithLaterDirectTargetObservation=bool(e['targetObserved']),episodesWithConfirmedSenderFollowup=bool(confirmed_links),episodesWithReportConsistentAction=any(x['kind'].startswith('report_consistent_') for x in confirmed_links))
  cell['counts'].update(c);cell['byMode'].setdefault(r['fixture']['mode'],collections.Counter()).update(c)
 # Count actual followup actions once within each game even if several attempt episodes refer to them.
 cell['counts']['uniqueConfirmedSenderFollowupActions']+=len({(x['ordinal'],x['kind'],x['target']) for x in r['followups'] if x['senderKnownName'] is not None})
 cell['counts']['uniqueConfirmedReportConsistentActions']+=len({(x['ordinal'],x['kind'],x['target']) for x in r['followups'] if x['senderKnownName'] is not None and x['kind'].startswith('report_consistent_')})
out=dict(kind='round055-descriptive-sender-followup',snapshotSHA256=hashlib.sha256(blob).hexdigest(),analysisSourceSHA256=hashlib.sha256(pathlib.Path(__file__).read_bytes()).hexdigest(),variants=result,limitations=['A later action is descriptive, not caused solely by this confirmation attempt.','Raw resources.falseReports combines missing stored-map proof with wrong names. truthWrongReports independently compares the actual emitted name to the post-choice assignment; missing stored-map entries are not false-report findings.','Attempt episodes may overlap; unique action counts remove episode duplication within each game.','No later report-consistent action is not a missed-opportunity finding; remaining activity/budget opportunities were not fully observed for this question.','Exact identity receipts and legitimate constraint deductions are separate. Raw memoryObservedAt/targetObserved track the stored perception known-map; derived singleton knowledge may be usable by the policy without appearing in that map. Do not treat an absent stored-map observation as forgetting. direct_known followup labels mean confirmed own knowledge, which may include valid deductions, not necessarily an exact identity receipt.','Raw counter incomingEligibleChoices is the pre-public-protection report-motivation gate; publiclyEligibleIncomingChoices independently applies diagnostic incoming-pool exclusions. Neither resource availability nor this pool proves the full policy reached its information stage.'])
pathlib.Path(sys.argv[2]).write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({v:c['counts'] for v,c in result.items()}))
