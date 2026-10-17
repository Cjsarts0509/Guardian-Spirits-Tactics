"""External episode selection only; classify possibilities using sender's saved inputs."""
import collections,gzip,importlib.util,json,pathlib,sys
spec=importlib.util.spec_from_file_location('v',pathlib.Path(__file__).with_name('verify-own-share-witness.py'));v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
def classify(d, guardian, target):
 diag=d['diagnostic'];peer=next(p for p in diag['peers'] if p['id']==guardian)
 if not any(t['id']==target for t in diag['targets']):return 'commander_not_own_confirmed'
 if not peer['alive']:return 'guardian_dead'
 # Report identity/route separately: neither can be repaired using hidden role assignment.
 if peer['known'] is None:return 'guardian_not_own_confirmed'
 if peer['reason']=='confirmed_other_side':return 'guardian_confirmed_other_side'
 if not peer['outgoingAlly']:return 'no_outgoing_ally_route'
 pair=next(p for p in diag['pairs'] if p['to']==guardian and p['target']==target)
 if pair['alreadySent']:return 'already_sent'
 if pair['tooLong']:return 'message_too_long'
 if diag['cooldownRemainingMs']>0:return 'send_interval'
 a=diag['proposal'];assert a is not None
 return 'selected_pair' if a['to']==guardian and a['text']==pair['text'] else 'earlier_priority_pair'
def analyze(witness,original_path,deaths_path):
 wb=v.read(witness);w=json.loads(wb);ob=v.read(original_path);tb=v.read(deaths_path)
 assert v.sha(ob)=='3660f8ce495e8789e011171ca23ceec9a1f97825e90a1020ba3d1d415ca0e822' and v.sha(tb)=='5ebe9e06cabb7077f016b43861775db30f4a42d4eab0308f7b99bf4a2654f62f'
 original=json.loads(ob);trace=json.loads(tb)
 def key(r):
  f=r.get('fixture') or r['result']['game']['fixture'];return r['variant'],f['seed'],f['reversed']
 originals={key(r):r for r in original['records']};traces={key(r):r for r in trace['records']};rows=[]
 for r in w['records']:
  o=originals[key(r)];v.validate_row(r,o);roles={p['character']:p['id'] for p in o['roles']}
  for sender in ['kilder','drakan']:
   for guardian,target in [('consume','eltas'),('kumarin','rael')]:
    # Select fixed grader episodes after observation. These identities never determine the recorded friends or queue.
    death=next((d for d in traces[key(r)]['deaths'] if d['character']==target),None)
    cutoff=death['boundary']['actionIndex'] if death else len(o['result']['actions']);choices=[d for d in r['decisions'] if d['player']==roles[sender] and d['beforeAppliedActions']<=cutoff]
    assert all(death is None or d['at']<=death['boundary']['at'] for d in choices)
    cases=[dict(at=d['at'],beforeAppliedActions=d['beforeAppliedActions'],state=classify(d,roles[guardian],roles[target]),diagnostic=d['diagnostic']) for d in choices]
    # Own knowledge and outgoing route are not interchangeable; preserve their overlap, not just first exclusion.
    target_known=[d for d in choices if any(t['id']==roles[target] for t in d['diagnostic']['targets'])]
    peer=lambda d:next(p for p in d['diagnostic']['peers'] if p['id']==roles[guardian])
    rows.append(dict(variant=r['variant'],fixture=r['fixture'],sender=sender,guardian=guardian,target=target,deathAt=death['boundary']['at'] if death else None,
      activeSenderChoices=len(choices),commanderOwnConfirmedChoices=len(target_known),guardianOwnConfirmedWithinThose=sum(peer(d)['known'] is not None for d in target_known),
      outgoingRouteWithinThose=sum(peer(d)['outgoingAlly'] for d in target_known),states=collections.Counter(c['state'] for c in cases),choices=cases))
 return dict(kind='own-share-path-analysis',sourceRef=w['sourceRef'],witnessSHA256=v.sha(wb),input045SHA256=v.sha(ob),input047SHA256=v.sha(tb),
     newResearchExecutions=0,uniqueOriginalGames=4,episodeCount=len(rows),rows=rows,limitations=['Repeated sender choices/paired policies are not independent trials.','Other-side sender episodes are coverage controls, not obligations to help an enemy guardian.','No policy change, counterfactual performance or human evidence.'])
if __name__=='__main__':
 if len(sys.argv)!=6:raise SystemExit('witness original045 deaths047 raw-output.gz summary-output')
 d=analyze(*sys.argv[1:4]);blob=v.enc(d)+b'\n';pathlib.Path(sys.argv[4]).write_bytes(gzip.compress(blob,mtime=0));s={k:x for k,x in d.items() if k!='rows'};s['rows']=[{k:x for k,x in r.items() if k!='choices'} for r in d['rows']];s['decodedSHA256']=v.sha(blob);pathlib.Path(sys.argv[5]).write_text(json.dumps(s,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:x for k,x in s.items() if k not in ['rows','limitations']},ensure_ascii=False))
