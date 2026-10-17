"""Independent own-sender diagnostic, receipt and visibility checks for round051."""
import collections,gzip,hashlib,json,pathlib,re,sys
def enc(x):return json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()
def sha(x):return hashlib.sha256(x).hexdigest()
def read(p):
 b=pathlib.Path(p).read_bytes();return gzip.decompress(b) if str(p).endswith('.gz') else b
def own_share(view,known,intel):
 me=view['me'];last=intel['lastSentAt'];cool=max(0,12000-(view['elapsedMs']-last));sent={p:dict(v) for p,v in intel['sent']};roles={r['key']:r for r in view['roster']};peers=[]
 for p in view['players']:
  if p['id']==me['id']:continue
  name=known.get(p['id']);r=roles.get(name);ally=p['id'] in me['allies']
  reason='dead' if not p['alive'] else 'no_outgoing_ally' if not ally else 'identity_unconfirmed' if not r else 'confirmed_other_side' if r['side']!=me['side'] else 'eligible_friend'
  peers.append(dict(id=p['id'],seat=p['seat'],alive=p['alive'],known=name,outgoingAlly=ally,reason=reason))
 friends=[p['id'] for p in peers if p['reason']=='eligible_friend'];targets=[]
 for p in view['players']:
  if p['alive'] and p['id']!=me['id'] and p['id'] in known:
   name=known[p['id']];role=roles[name];score=(3 if role['commander'] else 2) if role['side']!=me['side'] else 1
   targets.append(dict(id=p['id'],seat=p['seat'],character=name,score=score,name=role['name']))
 targets.sort(key=lambda p:(-p['score'],p['seat']));pairs=[]
 for t in targets:
  for f in friends:
   if f==t['id']:continue
   text=f"확인 정보: [{t['seat']}] {t['name']}";pairs.append(dict(target=t['id'],character=t['character'],to=f,text=text,alreadySent=sent.get(f,{}).get(t['id'])==t['character'],tooLong=len(text)>50))
 first=next((p for p in pairs if not p['alreadySent'] and not p['tooLong']),None)
 proposal=dict(type='chat',channel='whisper',to=first['to'],text=first['text']) if cool==0 and first else None
 return dict(lastSentAt=last,cooldownRemainingMs=cool,peers=peers,friends=friends,targets=targets,pairs=pairs,proposal=proposal)
def verify_intel(d):
 view=d['view'];me=d['player'];byseat={p['seat']:p['id'] for p in view['players']};names={r['name']:r['key'] for r in view['roster'] if r['inGame']};sent={};reports={};last=-12000
 for e in d['events']:
  data=e.get('data',{});m=re.fullmatch(r'확인 정보: \[(\d{1,2})\] (.+)',data.get('text',''))
  if e['kind'] not in ['chat.whisper','chat.ally'] or not m or int(m[1]) not in byseat or m[2] not in names:continue
  assert e['vis']['to']=='players' and me in e['vis']['ids'];target=byseat[int(m[1])];role=names[m[2]];sender=data['from']
  if sender==me:
   if e['kind']=='chat.whisper':sent.setdefault(data['to'],{})[target]=role;last=e['at']
  else:reports.setdefault(target,{})[sender]=dict(character=role,at=e['at'],seq=e['seq'])
 assert {p:dict(v) for p,v in d['intel']['sent']}==sent
 assert {p:dict(v) for p,v in d['intel']['reports']}==reports and d['intel']['lastSentAt']==last
def validate_row(r,o):
 assert r['fixture']==o['result']['game']['fixture'] and r['game']==o['result']['game'] and r['variant']==o['variant'] and r['wholeGameAndAllActionsMatched'] and r['originalCollectorMatched']
 assert r['originalRecordSHA256']==sha(enc(o)) and r['matchedActions']==len(o['result']['actions']) and r['originalCollectorPasses']==r['witnessPasses']==1
 assert r['senderCalls']==r['activeCalls']+r['inactiveCalls'] and r['activeCalls']==len(r['decisions'])
 keys=['player','at','action','accepted','error','beforeMana','afterMana','maxMana','nominalMana','character','side','beforeTrueName','beforePublished','receiptKinds'];actions=o['result']['actions'];assert r['actionsSHA256']==sha(enc([{k:a[k] for k in keys} for a in actions]))
 roles={p['id']:p for p in o['roles']};counts=collections.Counter();previous={};seen=set()
 for d in r['decisions']:
  p=d['player'];view=d['view'];known=dict(d['known']);ordinal=d['beforeAppliedActions'];assert len(known)==len(d['known']) and (p,d['at']) not in seen;seen.add((p,d['at']))
  assert view['me']['id']==p and view['me']['character']==roles[p]['character'] and view['me']['character'] in ['kilder','drakan'] and view['me']['alive'] and view['phase']=='running' and view['elapsedMs']==d['at'] and d['memoryUnchanged'] and d['engineUnchanged']
  assert 0<=ordinal<=len(actions)
  for other in view['players']:assert not {'mana','skills','flags','character','extraLives'}&set(other)
  seqs=[e['seq'] for e in d['events']];assert seqs==sorted(set(seqs))
  for e in d['events']:assert e['at']<=d['at'] and (e['vis']['to']=='all' or e['vis']['to']=='players' and p in e['vis']['ids'])
  if p in previous:
   old=previous[p];assert d['at']>old['at'] and ordinal>=old['beforeAppliedActions'] and d['events'][:len(old['events'])]==old['events']
  previous[p]=d;verify_intel(d)
  assert d['diagnostic']==own_share(view,known,d['intel']) and d['chosenCommunication']==d['diagnostic']['proposal']
  action=d['chosenCommunication'];counts['activeSenderCalls']+=1;counts['cooldownCalls']+=d['diagnostic']['cooldownRemainingMs']>0
  if action is not None:
   a=actions[ordinal];assert a['at']==d['at'] and a['player']==p and a['action']==action and a['accepted'] and 'chat.whisper' in a['receiptKinds'];counts['selectedAcceptedWhispers']+=1
  else:assert not any(a['at']==d['at'] and a['player']==p and a['action']['type']=='chat' for a in actions)
  # Truth is used only after the receiver-only diagnostic and actual choice are checked.
  counts['wrongKnownEntries']+=sum(roles[t]['character']!=name for t,name in known.items())
 return counts
def verify(path,original_path,journal,pub):
 original_blob=read(original_path);assert sha(original_blob)=='3660f8ce495e8789e011171ca23ceec9a1f97825e90a1020ba3d1d415ca0e822'
 original=json.loads(original_blob);blob=read(path);d=json.loads(blob);j=read(journal);p=json.loads(read(pub));meta={k:v for k,v in d.items() if k not in ['fingerprint','executions','complete','records','journalSha256']}
 assert d['kind']=='own-sender-share-witness' and d['input045SHA256']==sha(original_blob) and d['optionsSHA256']==original['optionsSHA256'] and d['settings']==original['settings'] and d['newResearchExecutions']==0
 assert sha(enc(meta))==d['fingerprint'] and d['complete'] and d['executions']==len(d['records'])==4
 lines=j.splitlines();assert json.loads(lines[0])==dict(type='header',fingerprint=d['fingerprint'],meta=meta) and [json.loads(x) for x in lines[1:]]==d['records']
 assert sha(j)==d['journalSha256']==p['journalSHA256'] and sha(blob)==p['snapshotSHA256'] and p['executions']==4 and p['complete'] and p['fingerprint']==d['fingerprint'] and p['version']==2
 for file,h in d['sourceHashes'].items():assert sha(pathlib.Path('packages/rules',file).read_bytes())==h
 for file,h in d['verificationHashes'].items():assert sha(pathlib.Path(file).read_bytes())==h
 selected=[o for o in original['records'] if o['result']['game']['fixture']['count']==12 and (o['result']['game']['fixture']['seed']==151009 and o['result']['game']['fixture']['reversed'] or o['result']['game']['fixture']['seed']==151014 and not o['result']['game']['fixture']['reversed'])];assert len(selected)==4
 rows=[];totals=collections.Counter()
 for r,o in zip(d['records'],selected):
  counts=validate_row(r,o);totals.update(counts);rows.append(dict(variant=r['variant'],fixture=r['fixture'],counts=counts))
 return dict(kind=d['kind'],sourceRef=d['sourceRef'],uniqueReplayedGames=4,originalCollectorPasses=4,witnessPasses=4,newResearchExecutions=0,rows=rows,totals=totals,snapshotSHA256=sha(blob),input045SHA256=sha(original_blob),optionsSHA256=d['optionsSHA256'],limitations=['Only four previously selected synthetic games, not new performance evidence.','Own sender inputs only; hidden truth grades outputs after selection.','All sender calls are after combat choice, without replacing combat.'])
if __name__=='__main__':
 if len(sys.argv)!=6:raise SystemExit('snapshot original045 journal publication summary-output')
 result=verify(*sys.argv[1:5]);pathlib.Path(sys.argv[5]).write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['rows','limitations']},ensure_ascii=False))
