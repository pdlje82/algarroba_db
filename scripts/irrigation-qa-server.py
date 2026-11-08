"""Serve the isolated, reviewed irrigation intake on a dedicated port."""
import os
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'output/irrigation-audit'
if not (QA/'qa.sqlite').is_file():raise RuntimeError('Run verify_irrigation_intake.py first.')
os.environ['KGB_DATABASE']=str(QA/'qa.sqlite')
sys.path.insert(0,str(ROOT))
import backend.app as module
import uvicorn
module.ROOT=QA
if __name__=='__main__':uvicorn.run(module.app,host='127.0.0.1',port=8771)
