"""Descriptive join of original accepted whispers to the recipient's actual own memory.
No policy execution, hidden-state policy input, new sample, or causal attribution.
"""
import argparse,collections,gzip,hashlib,json,pathlib,re
NAMES={'라엘':'rael','케인':'kane','엘타스':'eltas'}
SIDES={'rael':1,'kane':1,'eltas':2}
NAMED={'attack','advanced_attack','supreme_attack','soen_chain_murder'}
SPECIAL={'rael_master_power','kilder_master_power','consume_slaughter','kane_wolfs_slash'}
def raw(p):
 b=p.read_bytes();return gzip.decompress(b) if p.suffix=='.gz' else b
def sha(b):return hashlib.sha256(b).hexdigest()
def key(v,f):return (v,f['seed'],f['reversed'])
def report_key(recipient,sender,at,target,role):return (recipient,sender,at,target,role)
def analyze(source,audit):
 assert source['complete'] and source['executions']==320==len(source['records'])==audit['replayedGames']==len(audit['records'])
 original={key(r['variant'],r['result']['game']['fixture']):r for r in source['records']};assert len(original)==320
 messages=[];episodes=[];counts=collections.Counter();seen_games=set();supreme_windows={}
 for replay in audit['records']:
  gkey=key(replay['variant'],replay['fixture']);assert gkey not in seen_games;seen_games.add(gkey);o=original[gkey]
  assert replay['game']==o['result']['game'] and replay['gameMatched'] and replay['actionsMatched']
  by_id={p['id']:p for p in o['roles']};seats={i+1:p for i,p in enumerate(o['roles'])};order={p['id']:i for i,p in enumerate(o['roles'])};end_alive={p['character']:p['alive'] for p in replay['game']['survivors']}
  choices=collections.defaultdict(list)
  for q in replay['decisions']:choices[q['player']].append(q)
  sent={};game_messages=[]
  for a in o['result']['actions']:
   act=a['action']
   if act['type']!='chat' or act.get('channel')!='whisper' or not act['text'].startswith('확인 정보: '):continue
   counts['allInformationWhispers']+=1;assert a['accepted'] and a['receiptKinds']==['chat.whisper'] and a['grading']['report']
   match=re.fullmatch(r'확인 정보: \[(\d{1,2})\] (.+)',act['text']);assert match and a['grading']['reportExpectedName']==match[2]
   if match[2] not in NAMES:continue
   role=NAMES[match[2]];target=seats[int(match[1])]['id'];recipient=act['to'];sender=a['player']
   assert by_id[target]['character']==role and by_id[sender]['side']==by_id[recipient]['side']
   counts['allCommanderWhispers']+=1
   if by_id[recipient]['side']==SIDES[role]:counts['friendlyCommanderWhispersExcluded']+=1;continue
   counts['enemyCommanderWhispers']+=1
   k=report_key(recipient,sender,a['at'],target,role);assert k not in sent
   m=dict(variant=replay['variant'],fixture=replay['fixture'],recipient=recipient,recipientRole=by_id[recipient]['character'],recipientSide=by_id[recipient]['side'],sender=sender,senderRole=by_id[sender]['character'],at=a['at'],target=target,role=role,text=act['text'],accepted=True,receiptKinds=a['receiptKinds'],recipientAliveAtEnd=end_alive[by_id[recipient]['character']],observations=[])
   sent[k]=m;game_messages.append(m)
  # Every received commander report in every active choice must join a real accepted whisper.
  for q in replay['decisions']:
   for t in q['targets']:
    if q['character']=='eltas' and q['mana']>=100 and t['trustedReportIds'] and any(s['key']=='supreme_attack' and s['blocked'] is None and t['role'] in (s['nameOptions'] or []) for s in q['skills']):
     wk=(replay['variant'],t['role'],'before4min' if q['at']<240000 else 'after4min')
     w=supreme_windows.setdefault(wk,dict(choices=0,games=set(),seeds=set(),originalActions=collections.Counter()));w['choices']+=1;w['games'].add(gkey);w['seeds'].add(replay['fixture']['seed']);w['originalActions'][(q['action'] or {}).get('skill','null')]+=1
    for report in t['reports']:
     rk=report_key(q['player'],report['sender'],report['at'],report['target'],t['role']);assert rk in sent
     m=sent[rk];assert report['at']<=q['at'];m['observations'].append((q,t,report))
  for m in game_messages:
   obs=m.pop('observations');m['observedChoices']=len(obs);m['receiptSeq']=obs[0][2]['seq'] if obs else None
   assert all(report['seq']==m['receiptSeq'] for q,t,report in obs)
   first=obs[0] if obs else None
   def state(q,t,report):
    if t['id']==m['target']:return 'confirmed_living' if t['alive'] else 'confirmed_dead'
    if m['target'] in t['trustedReportIds']:return 'trusted_unconfirmed'
    if not report['targetAlive']:return 'target_dead'
    if not report['senderKnown']:return 'sender_unconfirmed'
    assert by_id[report['sender']]['character']==report['senderKnown']
    if not report['senderAlive']:return 'sender_dead'
    if not report['compatible']:return 'candidate_conflict'
    return 'other_untrusted'
   m['firstObservation']=None if not first else dict(at=first[0]['at'],lagMs=first[0]['at']-m['at'],state=state(*first),action=first[0]['action'],senderKnown=first[2]['senderKnown'],senderAlive=first[2]['senderAlive'],targetAlive=first[2]['targetAlive'],namedSkills=[s['key'] for s in first[0]['skills'] if s['key'] in NAMED])
   later=[q for q in choices[m['recipient']] if q['at']>m['at'] or q['at']==m['at'] and order[m['recipient']]>order[m['sender']]]
   m['unobservedReason']=None if obs else 'no_later_choice_end_alive' if not later and m['recipientAliveAtEnd'] else 'no_later_choice_end_dead' if not later else 'later_choice_without_receipt'
   assert m['unobservedReason']!='later_choice_without_receipt'
   m['states']=dict(collections.Counter(state(*x) for x in obs))
   m['trustedChoices']=sum(state(*x)=='trusted_unconfirmed' for x in obs)
   m['trustedNamedResourceReadyChoices']=sum(state(q,t,report)=='trusted_unconfirmed' and any(s['key'] in NAMED and s['blocked'] is None and m['role'] in (s['nameOptions'] or []) for s in q['skills']) for q,t,report in obs)
   m['laterConfirmedLivingAt']=next((q['at'] for q,t,report in obs if t['id']==m['target'] and t['alive']),None)
   m['laterAttackChoices']=[dict(at=q['at'],action=q['action'],known=q['selectedKnownRole']==m['role']) for q in later if q['selectedKind'] in ['named_attack','special_attack'] and (q['action'] or {}).get('target')==m['target']]
   m['firstObservedSenderCheck']=next((dict(at=q['at'],action=q['action']) for q in later if (q['action'] or {}).get('target')==m['sender'] and (('check' in (q['action'] or {}).get('skill','')) or 'scan' in (q['action'] or {}).get('skill','') or (q['action'] or {}).get('skill')=='truth_gem')),None)
   messages.append(m)
  grouped=collections.defaultdict(list)
  for m in game_messages:grouped[m['recipient'],m['target']].append(m)
  for (recipient,target),group in grouped.items():
   group.sort(key=lambda m:(m['at'],order[m['sender']]));first=group[0];delivered_at=first['at']
   # Deduplicate recipient/target episodes and repeated observation of one receipt.
   after=[]
   for q in choices[recipient]:
    t=next(t for t in q['targets'] if t['role']==first['role'])
    matching=[report for report in t['reports'] if report_key(recipient,report['sender'],report['at'],target,t['role']) in sent and report['target']==target]
    if matching:after.append((q,t,matching))
   trusted=[(q,t,rr) for q,t,rr in after if target in t['trustedReportIds']]
   ready=[(q,t,rr) for q,t,rr in trusted if any(s['key'] in NAMED and s['blocked'] is None and first['role'] in (s['nameOptions'] or []) for s in q['skills'])]
   first_state=first['firstObservation']['state'] if first['firstObservation'] else first['unobservedReason']
   confirmed=any(t['id']==target and t['alive'] for q,t,rr in after)
   episodes.append(dict(variant=replay['variant'],fixture=replay['fixture'],recipient=recipient,recipientRole=first['recipientRole'],recipientSide=first['recipientSide'],target=target,role=first['role'],firstDeliveryAt=delivered_at,messages=len(group),senders=[m['sender'] for m in group],firstState=first_state,observedChoices=len(after),trustedChoices=len(trusted),namedResourceReadyChoices=len(ready),firstTrustedAt=trusted[0][0]['at'] if trusted else None,firstNamedResourceReadyAt=ready[0][0]['at'] if ready else None,
    confirmedLivingAfter=confirmed,newConfirmedLivingAfter=confirmed and first_state not in ['confirmed_living','confirmed_dead'],attackedAfter=any(m['laterAttackChoices'] for m in group),senderCheckedAfter=any(m['firstObservedSenderCheck'] for m in group),recipientAliveAtEnd=first['recipientAliveAtEnd']))
 assert seen_games==set(original)
 assert len(messages)==counts['enemyCommanderWhispers']
 rows=[]
 for variant in source['variants']:
  for count in [0,8,9,10,11,12]:
   for role in ['eltas','rael','kane']:
    for recipient_role in ['all']+sorted({e['recipientRole'] for e in episodes if e['variant']==variant and e['role']==role}):
     subset=[e for e in episodes if e['variant']==variant and e['role']==role and (not count or e['fixture']['count']==count) and (recipient_role=='all' or e['recipientRole']==recipient_role)]
     if not subset:continue
     c=collections.Counter()
     for e in subset:
      c['episodes']+=1;c['messages']+=e['messages'];c['observedEpisodes']+=bool(e['observedChoices']);c['first:'+e['firstState']]+=1
      c['everTrustedEpisodes']+=bool(e['trustedChoices']);c['trustedChoices']+=e['trustedChoices'];c['resourceReadyEpisodes']+=bool(e['namedResourceReadyChoices']);c['resourceReadyChoices']+=e['namedResourceReadyChoices'];c['confirmedLivingAfterEpisodes']+=e['confirmedLivingAfter'];c['newConfirmedLivingAfterEpisodes']+=e['newConfirmedLivingAfter'];c['attackedAfterEpisodes']+=e['attackedAfter'];c['senderCheckedAfterEpisodes']+=e['senderCheckedAfter']
     rows.append(dict(variant=variant,count=count,role=role,recipientRole=recipient_role,games=len({(e['fixture']['seed'],e['fixture']['reversed']) for e in subset}),independentSeeds=len({e['fixture']['seed'] for e in subset}),counts=c))
 windows=[dict(variant=k[0],role=k[1],period=k[2],choices=v['choices'],games=len(v['games']),independentSeeds=len(v['seeds']),originalActions=v['originalActions']) for k,v in sorted(supreme_windows.items())]
 return dict(counts=counts,rows=rows,messages=messages,episodes=episodes,supremeResourceOnlyWindows=windows)
def main():
 p=argparse.ArgumentParser();p.add_argument('source',type=pathlib.Path);p.add_argument('audit',type=pathlib.Path);p.add_argument('verified',type=pathlib.Path);p.add_argument('output',type=pathlib.Path);a=p.parse_args()
 sr=raw(a.source);ar=raw(a.audit);vr=raw(a.verified);source=json.loads(sr);audit=json.loads(ar);verified=json.loads(vr)
 assert audit['sourceSHA256']==verified['sourceSHA256']==sha(sr) and verified['replaySHA256']==sha(ar) and verified['allGamesAndActionReceiptsMatched']
 result=analyze(source,audit)
 # Recipient/target deduplication must reproduce all041 trusted-report active choices.
 for row in verified['roleRows']:
  matched=[r for r in result['rows'] if r['variant']==row['variant'] and r['count']==row['count'] and r['role']==row['role'] and r['recipientRole']=='all']
  assert sum(r['counts']['trustedChoices'] for r in matched)==row['counts'].get('unknownWithTrustedReport',0)
 out=dict(kind='commander-report-chain',sourceSHA256=sha(sr),ownObservationSHA256=sha(ar),verifiedSummarySHA256=sha(vr),analysisSHA256=sha(pathlib.Path(__file__).read_bytes()),policySourceHashes=audit['policySourceHashes'],optionsSHA256=audit['optionsSHA256'],researchExecutions=0,replayedGames=0,analyzedExistingGames=320,**result,
  limitations=['Descriptive analysis of existing development games, not independent or human matches.','Reports remain uncertain; no knowledge is added to policy.','Ready resources do not establish legal targeting: unknown-target public invulnerability was not stored by round041.','Episodes merge multiple senders; active choices and per-message follow-up counts are correlated.','Later knowledge/attack does not prove that the report caused it.','No-later-choice censoring uses final survival; exact death timing is not present in these inputs.'])
 data=(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n').encode();a.output.write_bytes(gzip.compress(data,mtime=0) if a.output.suffix=='.gz' else data)
 print(json.dumps(dict(counts=result['counts'],messages=len(result['messages']),episodes=len(result['episodes']),researchExecutions=0),ensure_ascii=False,indent=2))
if __name__=='__main__':main()
