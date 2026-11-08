"""Serve a separate community-editor QA store on port 8769."""
import os
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'output/planning-qa'
QA.mkdir(parents=True,exist_ok=True)
database=QA/'knowledge.sqlite'
if not database.is_file():raise RuntimeError('Create and migrate the isolated QA database before starting this server.')
os.environ['KGB_DATABASE']=str(database)
sys.path.insert(0,str(ROOT))
import backend.app as module
import uvicorn

# Existing browser suites use this isolated destination for research-task files.
module.ROOT=ROOT/'output/consolidation-qa'
module.ROOT.mkdir(parents=True,exist_ok=True)
(QA/'server.pid').write_text(str(os.getpid()),encoding='ascii')
if __name__=='__main__':uvicorn.run(module.app,host='127.0.0.1',port=8769)
