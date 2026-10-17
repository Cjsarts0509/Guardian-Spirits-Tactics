"""Collector persistence smoke games only (seed 23); never research/promotion evidence."""
import gzip,os,shutil,hashlib,json,pathlib,subprocess,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]
class CollectorStorageTests(unittest.TestCase):
 def test_all_collectors_resume_repair_and_publish(self):
  with tempfile.TemporaryDirectory(prefix='gst-store-smoke-') as tmp:
   for script,step in [('claim-pairs',2),('ally-pairs',2),('report-pairs',2),('claim-commitment',3)]:
    with self.subTest(collector=script):
     out=pathlib.Path(tmp)/(script+'.json');journal=out.with_suffix('.journal.ndjson')
     cmd=['node','--import',str(ROOT/'packages/rules/node_modules/tsx/dist/loader.mjs'),str(ROOT/f'packages/rules/scripts/cooperative-{script}.ts'),'1','23',str(out)]
     def run(batch):return subprocess.run(cmd+[str(batch)],cwd=ROOT,text=True,capture_output=True,check=True)
     run(step);self.assertEqual(json.loads(out.read_text())['executions'],step)
     run(step);self.assertEqual(json.loads(out.read_text())['executions'],step*2)
     run(0);snapshot=json.loads(out.read_text());self.assertTrue(snapshot['complete'])
     verify=['python',str(ROOT/f'tools/verify-{script}.py'),str(out),'--journal-path',str(journal)]
     summary=json.loads(subprocess.check_output(verify,cwd=ROOT));self.assertTrue(summary['publicationVerified'])
     digest=lambda:hashlib.sha256(journal.read_bytes()).hexdigest()
     before=digest();r=run(0);self.assertIn('신규0',r.stderr);self.assertEqual(before,digest())
     lines=journal.read_bytes().splitlines(keepends=True);journal.write_bytes(b''.join(lines[:1]+lines[2:]))
     bad=subprocess.run(verify,cwd=ROOT,capture_output=True);self.assertNotEqual(bad.returncode,0)
     r=run(0);self.assertIn('신규0',r.stderr);self.assertEqual(before,digest())
     self.assertTrue(json.loads(subprocess.check_output(verify,cwd=ROOT))['publicationVerified'])
     if dest:=os.environ.get('GST_STORAGE_SMOKE_ARTIFACT_DIR'):
      dest=pathlib.Path(dest);dest.mkdir(parents=True,exist_ok=True)
      for src in [out,journal]: (dest/(src.name+'.gz')).write_bytes(gzip.compress(src.read_bytes(),mtime=0))
      shutil.copyfile(out.with_suffix('.publication.json'),dest/(out.stem+'.publication.json'))
      (dest/(out.stem+'.verified.json')).write_text(json.dumps(summary,ensure_ascii=False,indent=2))
if __name__=='__main__':unittest.main()
