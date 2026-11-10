"""Serve the checked funding hierarchy on an isolated SQLite copy, port 8774."""
import argparse
import json
import os
from pathlib import Path
import sqlite3
import sys

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--database', type=Path, required=True)
args = parser.parse_args()
target = args.database.resolve()
if target == (ROOT / 'data/knowledge.sqlite').resolve():
    raise SystemExit('Choose a separate QA database.')
target.parent.mkdir(parents=True, exist_ok=True)
if not target.exists():
    with sqlite3.connect((ROOT / 'data/knowledge.sqlite').as_uri() + '?mode=ro', uri=True) as source:
        with sqlite3.connect(target) as destination:
            source.backup(destination)
os.environ['KGB_DATABASE'] = str(target)
sys.path.insert(0, str(ROOT))
from backend.store import Store
store = Store(target)
batch = json.loads((ROOT / 'imports/funding-hierarchy-2026-11-10-01.json').read_text(encoding='utf-8'))
store.import_batch(batch, True)
print(store.import_batch(batch), flush=True)
import backend.app as module
import uvicorn
module.ROOT = target.parent
if __name__ == '__main__':
    uvicorn.run(module.app, host='127.0.0.1', port=8774)
