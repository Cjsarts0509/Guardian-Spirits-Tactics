import fcntl,gzip,json,shutil,pathlib,subprocess,tempfile,unittest,hashlib,os
ROOT=pathlib.Path(__file__).resolve().parents[1]
class GenerationTests(unittest.TestCase):
 def command(self,out,*extra):return ['python','tools/run-cooperative-generations.py','1','25',str(out),'2','--unit-current-source',*extra]
 def test_native_lock_rejects_overlap_and_releases_after_holder_exit(self):
  with tempfile.TemporaryDirectory() as tmp:
   out=pathlib.Path(tmp)/'data.json';path=pathlib.Path(str(out)+'.run.lock')
   holder=subprocess.Popen(['python','-u','-c',"import fcntl,sys,time;f=open(sys.argv[1],'a+');fcntl.flock(f,fcntl.LOCK_EX);print('ready',flush=True);time.sleep(30)",str(path)],stdout=subprocess.PIPE,text=True)
   try:
    self.assertEqual(holder.stdout.readline().strip(),'ready');r=subprocess.run(self.command(out),cwd=ROOT,capture_output=True);self.assertNotEqual(r.returncode,0);self.assertIn(b'Another generation supervisor',r.stderr);self.assertFalse(out.exists())
   finally:holder.terminate();holder.wait();holder.stdout.close()
   with open(path,'a+') as f:fcntl.flock(f,fcntl.LOCK_EX|fcntl.LOCK_NB)
 def test_existing_canonical_writer_is_preserved(self):
  with tempfile.TemporaryDirectory() as tmp:
   out=pathlib.Path(tmp)/'data.json';cache=pathlib.Path(str(out)+'.store');cache.mkdir();lock=cache/'WRITER.lock';lock.write_text('other owner')
   r=subprocess.run(self.command(out),cwd=ROOT,capture_output=True);self.assertNotEqual(r.returncode,0);self.assertEqual(lock.read_text(),'other owner');self.assertFalse(out.exists())
 def test_actual_batches_resume_without_new_games_and_refuse_tampering(self):
  with tempfile.TemporaryDirectory() as tmp:
   out=pathlib.Path(tmp)/'data.json';subprocess.run(self.command(out),cwd=ROOT,check=True,capture_output=True)
   summary=out.with_suffix('.verified.json');verified=json.loads(summary.read_bytes());self.assertIn('developmentGatePassed',verified);self.assertIn('holdoutGatePassed',verified);self.assertEqual(len(verified['contrasts']),2)
   data=json.loads(out.read_text());self.assertTrue(data['complete']);self.assertEqual(data['executions'],144);self.assertFalse(pathlib.Path(str(out)+'.store').exists())
   journal=out.with_suffix('.journal.ndjson');original=journal.read_bytes();events=out.with_suffix('.batches.ndjson');rows=[json.loads(x) for x in events.read_text().splitlines()];self.assertEqual([x['newGames'] for x in rows],[96,48])
   summary.unlink() # Lost derived summary must be restored without collecting any match.
   run=subprocess.run(self.command(out),cwd=ROOT,text=True,capture_output=True,check=True);self.assertEqual(json.loads(summary.read_bytes()),verified);self.assertEqual(json.loads(run.stdout)['newGames'],0);self.assertEqual(journal.read_bytes(),original);self.assertEqual(len(events.read_text().splitlines()),2)
   first=next(p for p in pathlib.Path(str(out)+'.generations').glob('batch-*/data.json') if json.loads(p.read_bytes())['executions']==96)
   for ext in ['.json','.journal.ndjson','.publication.json']:shutil.copyfile(first.with_suffix(ext),out.with_suffix(ext))
   recovered=subprocess.run(self.command(out),cwd=ROOT,text=True,capture_output=True,check=True);self.assertTrue(json.loads(recovered.stdout)['recoveredExport']);self.assertEqual(json.loads(out.read_bytes())['executions'],144);self.assertEqual(journal.read_bytes(),original);self.assertEqual(json.loads(summary.read_bytes()),verified)
   self.assertEqual(json.loads(events.read_text().splitlines()[-1])['newGames'],0)
   journal.write_bytes(b'\n'.join(original.splitlines()[:-1])+b'\n');bad=subprocess.run(self.command(out),cwd=ROOT,capture_output=True);self.assertNotEqual(bad.returncode,0);self.assertEqual(len(events.read_text().splitlines()),3)
   if dest:=os.environ.get('GST_GENERATION_TEST_ARTIFACT_DIR'):
    dest=pathlib.Path(dest);dest.mkdir(parents=True,exist_ok=True)
    (dest/'data.json.gz').write_bytes(gzip.compress(out.read_bytes(),mtime=0));(dest/'data.journal.ndjson.gz').write_bytes(gzip.compress(original,mtime=0));(dest/'data.publication.json').write_bytes(out.with_suffix('.publication.json').read_bytes());(dest/'data.batches.ndjson').write_bytes(events.read_bytes())
if __name__=='__main__':unittest.main()
