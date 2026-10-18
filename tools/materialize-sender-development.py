"""Reassemble transport-sized gzip parts with exact compressed/decoded SHA256 checks."""
import gzip,hashlib,json,pathlib,sys
manifest=pathlib.Path(sys.argv[1]);d=json.loads(manifest.read_text());parts=[]
assert d['kind']=='gst-evaluation-multipart-gzip' and d['sourceRef']=='1b7bbf1512218be16ae3d8a8f432407b79226751'
for p in d['parts']:
 assert pathlib.PurePath(p['name']).name==p['name']
 b=manifest.with_name(p['name']).read_bytes();assert len(b)==p['bytes'] and hashlib.sha256(b).hexdigest()==p['sha256'];parts.append(b)
compressed=b''.join(parts);assert len(compressed)==d['compressedBytes'] and hashlib.sha256(compressed).hexdigest()==d['compressedSHA256']
raw=gzip.decompress(compressed);assert hashlib.sha256(raw).hexdigest()==d['decodedSHA256'];x=json.loads(raw);assert x['executions']==d['executions']==1152 and x['sourceRef']==d['sourceRef'] and x['complete']
out=pathlib.Path(sys.argv[2]);out.write_bytes(compressed if str(out).endswith('.gz') else raw)
print(json.dumps(dict(executions=1152,compressedSHA256=d['compressedSHA256'],decodedSHA256=d['decodedSHA256'],parts=len(parts))))
