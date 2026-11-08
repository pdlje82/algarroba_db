"""Isolated server for image intake and browser checks."""
import os,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'output/plant-images-qa'
os.environ['KGB_DATABASE']=str(QA/'knowledge.sqlite')
sys.path.insert(0,str(ROOT))
import backend.app as module
import uvicorn
module.ROOT=QA
(QA/'server.pid').write_text(str(os.getpid()),encoding='ascii')
if __name__=='__main__':uvicorn.run(module.app,host='127.0.0.1',port=8771)
