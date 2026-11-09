"""Serve the isolated, reviewed irrigation intake on a dedicated port."""
import argparse
import os
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
QA=ROOT/'output/irrigation-audit'
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--database',type=Path,default=ROOT/'output/irrigation-context/qa.sqlite')
args=parser.parse_args()
if not args.database.is_file():raise RuntimeError('Create an isolated QA database containing the current accepted intake first.')
os.environ['KGB_DATABASE']=str(args.database.resolve())
sys.path.insert(0,str(ROOT))
import backend.app as module
import uvicorn
module.ROOT=QA
if __name__=='__main__':uvicorn.run(module.app,host='127.0.0.1',port=8771)
