import gzip,hashlib,json,pathlib,sys,copy,unittest
def read(p):
 b=pathlib.Path(p).read_bytes();return gzip.decompress(b) if p.endswith('.gz') else b
def sha(b):return hashlib.sha256(b).hexdigest()
def enc(x):return json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()
proof=json.loads(read(sys.argv[1]));raw=read(sys.argv[2]);data=json.loads(raw);assert proof['inputSHA256']==sha(raw) and proof['replayedGames']==len(proof['records'])==8 and proof['newResearchExecutions']==0
def key(r):
 f=r['fixture'];return f['mode'],r.get('style'),r.get('variant'),f['seed'],f['reversed'],f['currentSide']
originals={key(r):r for r in data['records']}
def validate(p):
 r=originals[key(p)];assert p['wholeGameAndReceiptsMatched'] and p['matchedActions']==len(r['actions'])
 fields=['player','at','action','accepted','error','side','character','beforeMana','afterMana','maxMana','nominalMana','receiptKinds']
 assert p['actionsSHA256']==sha(enc([{k:a[k] for k in fields} for a in r['actions']]))
 assert p['sparseStoredMapCases']==len(p['proofs']) and p['reportProofs']==sum(a['side']==r['fixture']['currentSide'] and a['grade']['reportTarget'] is not None for a in r['actions'])
 roles={x['id']:x for x in r['roles']}
 for d in p['proofs']:
  assert d['view']['me']['id']==d['player'] and d['view']['me']['character']==roles[d['player']]['character'] and d['memoryUnchanged']
  assert d['target'] not in dict(d['storedKnown']) and dict(d['workingKnown'])[d['target']]==d['reportedName']==roles[d['target']]['character'] and dict(d['workingCandidates'])[d['target']]==[d['reportedName']]
  a=r['actions'][d['ordinal']];assert a['player']==d['player'] and a['at']==d['at'] and a['action']==d['action'] and a['grade']['reportedName']==d['reportedName'] and a['grade']['reportKnownName'] is None
  for q in d['view']['players']:assert not {'character','mana','skills','flags','extraLives'}&set(q)
  for e in d['events']:assert e['at']<=d['at'] and (e['vis']['to']=='all' or e['vis']['to']=='players' and d['player'] in e['vis']['ids'])
 return len(p['proofs'])
class Checks(unittest.TestCase):
 def bad(self,change):
  p=copy.deepcopy(proof['records'][0]);change(p)
  with self.assertRaises((AssertionError,KeyError)):validate(p)
 def test_valid(self):
  for p in proof['records']:validate(p)
 def test_false_receipts(self):self.bad(lambda p:p.update(actionsSHA256='0'*64))
 def test_false_working_name(self):self.bad(lambda p:p['proofs'][0].update(reportedName='fake'))
 def test_hidden_resource(self):self.bad(lambda p:p['proofs'][0]['view']['players'][0].update(mana=999))
 def test_private_other(self):self.bad(lambda p:p['proofs'][0]['events'].append(dict(at=0,vis=dict(to='players',ids=['other']))))
 def test_false_stored_map(self):self.bad(lambda p:p['proofs'][0]['storedKnown'].append([p['proofs'][0]['target'],p['proofs'][0]['reportedName']]))
if '--test' in sys.argv:unittest.main(argv=[sys.argv[0]])
else:print(json.dumps(dict(replayed=8,matchedActions=sum(p['matchedActions'] for p in proof['records']),reportsChecked=sum(p['reportProofs'] for p in proof['records']),sparseStoredMapCases=sum(validate(p) for p in proof['records']))))
