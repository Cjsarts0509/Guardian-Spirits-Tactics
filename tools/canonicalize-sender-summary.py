"""Deterministic presentation of a derived JSON summary; no numeric edits."""
import json,pathlib,sys
x=json.loads(pathlib.Path(sys.argv[1]).read_text())
pathlib.Path(sys.argv[2]).write_text(json.dumps(x,ensure_ascii=False,sort_keys=True,indent=2)+'\n')
