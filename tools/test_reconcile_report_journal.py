import copy,hashlib,json,pathlib,subprocess,tempfile,unittest
SCRIPT=pathlib.Path(__file__).with_name('reconcile-report-journal.py').resolve()
encode=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':')).encode()
class RecoveryTests(unittest.TestCase):
    def case(self,snapshot_variants,journal_variants,conflict=False,duplicate=False):
        d=tempfile.TemporaryDirectory();root=pathlib.Path(d.name);meta={'start':1,'count':1};fp=hashlib.sha256(encode(meta)).hexdigest();f={'mode':'civil_war','seed':1,'count':8,'reversed':False,'currentSide':1}
        result=lambda v:{'game':{'fixture':f},'unchangedRecord':{'variant':v,'n':3}}
        pair={'fixture':f,**{v:result(v) for v in snapshot_variants}};snapshot={**meta,'fingerprint':fp,'complete':False,'executions':len(snapshot_variants),'journalSha256':'old','rows':[{'mode':'civil_war','style':'truthful','pairs':[pair]}]}
        header={'type':'header','fingerprint':fp,'meta':meta};lines=[encode(header)]
        for v in journal_variants:
            r=result(v)
            if conflict:r['unchangedRecord']['n']=4
            lines.append(encode({'type':'game','mode':'civil_war','style':'truthful','variant':v,'result':r}))
        if duplicate:lines.append(lines[-1])
        p=root/'raw.json';j=root/'journal.ndjson';p.write_bytes(encode(snapshot));j.write_bytes(b'\n'.join(lines)+b'\n');return d,root,p,j
    def run_recovery(self,p,j,root):return subprocess.run(['python',str(SCRIPT),str(p),'--journal-path',str(j),'--lineage',str(root/'lineage.json')],capture_output=True)
    def test_union_keeps_each_record_and_accurate_digest(self):
        d,root,p,j=self.case(['control'],['normal'])
        with d:
            r=self.run_recovery(p,j,root);self.assertEqual(r.returncode,0,r.stderr);s=json.loads(p.read_bytes());self.assertEqual(s['executions'],2);self.assertFalse(s['complete']);self.assertEqual(s['journalSha256'],hashlib.sha256(j.read_bytes()).hexdigest())
            pair=s['rows'][0]['pairs'][0];self.assertEqual(pair['control']['unchangedRecord'],{'variant':'control','n':3});self.assertEqual(pair['normal']['unchangedRecord'],{'variant':'normal','n':3})
    def test_conflicting_overlap_rejected_without_input_writes(self):
        d,root,p,j=self.case(['control'],['control'],conflict=True)
        with d:
            before=(p.read_bytes(),j.read_bytes());self.assertNotEqual(self.run_recovery(p,j,root).returncode,0);self.assertEqual(before,(p.read_bytes(),j.read_bytes()))
    def test_duplicate_in_one_input_rejected_without_input_writes(self):
        d,root,p,j=self.case(['control'],['control'],duplicate=True)
        with d:
            before=(p.read_bytes(),j.read_bytes());self.assertNotEqual(self.run_recovery(p,j,root).returncode,0);self.assertEqual(before,(p.read_bytes(),j.read_bytes()))
if __name__=='__main__':unittest.main()

