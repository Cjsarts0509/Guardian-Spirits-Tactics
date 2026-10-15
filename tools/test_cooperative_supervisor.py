"""An existing unknown writer must never be stolen or overwritten by the batch supervisor."""
import pathlib,subprocess,tempfile,unittest,json
ROOT=pathlib.Path(__file__).resolve().parents[1]
class SupervisorTests(unittest.TestCase):
 def test_unknown_writer_is_preserved_and_collector_not_started(self):
  with tempfile.TemporaryDirectory() as tmp:
   out=pathlib.Path(tmp)/'data.json';store=pathlib.Path(str(out)+'.store');store.mkdir();lock=store/'WRITER.lock';raw=json.dumps({'owner':'other-running-writer','pid':123,'leaseUntil':9999999999999});lock.write_text(raw)
   r=subprocess.run(['node','tools/run-cooperative-batches.mjs','1','24',str(out),'1','0cd29f103ad672a6759c1b9ea0e0702227535610'],cwd=ROOT,capture_output=True)
   self.assertNotEqual(r.returncode,0);self.assertIn(b'Existing writer lock',r.stderr);self.assertEqual(lock.read_text(),raw);self.assertFalse(out.exists());self.assertEqual(list(store.iterdir()),[lock])
if __name__=='__main__':unittest.main()
