"""Run v6 browser verification against a separate local database, never the accepted store."""
import os
import sqlite3
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'output'/'consolidation-qa'
QA.mkdir(parents=True,exist_ok=True)
target=QA/'knowledge.sqlite'
if not target.exists():
    with sqlite3.connect((ROOT/'data'/'knowledge.sqlite').as_uri()+'?mode=ro',uri=True) as source:
        with sqlite3.connect(target) as destination:source.backup(destination)
os.environ['KGB_DATABASE']=str(target)
sys.path.insert(0,str(ROOT))
import backend.app as module
import uvicorn
# Static files were mounted from the project before changing the research destination.
module.ROOT=QA
(QA/'server.pid').write_text(str(os.getpid()),encoding='ascii')
if __name__=='__main__':uvicorn.run(module.app,host='127.0.0.1',port=8769)
