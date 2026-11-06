"""Double-click launcher. The application is local; its server runs without a terminal window."""
import argparse
import json
import os
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
URL='http://127.0.0.1:8765'


def health():
    try:
        with urllib.request.urlopen(URL+'/api/health',timeout=1) as response:return json.load(response)
    except (OSError,ValueError):return None


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--stop',action='store_true');parser.add_argument('--no-browser',action='store_true');args=parser.parse_args()
    os.chdir(ROOT)
    running=health()
    ours=running and running.get('application')=='algarroba-knowledge-browser' and Path(running.get('project','')).resolve()==ROOT.resolve()
    if args.stop:
        if ours:os.kill(running['pid'],signal.SIGTERM);print('Knowledge Browser stopped. Saved knowledge is safe.')
        else:print('This project is not running. No other process was stopped.')
        return
    if running and not ours:raise RuntimeError('Port 8765 is being used by another application. Close that application or ask Codex to adjust the Knowledge Browser port.')
    if not (ROOT/'dist/index.html').exists():raise RuntimeError('Run Setup Knowledge Browser.cmd once before starting.')
    if not ours:
        from backend.store import Store
        if not Store().records('topics'):
            from backend.cli import bootstrap
            print('Preparing the selected source collection for the first start…');bootstrap(Store())
        log_folder=ROOT/'data';log_folder.mkdir(exist_ok=True)
        command=[sys.executable,'-m','uvicorn','backend.app:app','--host','127.0.0.1','--port','8765']
        options={'cwd':str(ROOT),'stdin':subprocess.DEVNULL}
        if os.name=='nt':options['creationflags']=subprocess.CREATE_NO_WINDOW
        else:options['start_new_session']=True
        with (log_folder/'server.log').open('a',encoding='utf-8') as log:
            process=subprocess.Popen(command,stdout=log,stderr=log,**options)
        (log_folder/'server.pid').write_text(str(process.pid),encoding='ascii')
        for _ in range(60):
            if health():break
            if process.poll() is not None:raise RuntimeError('The browser could not start. Details are in data/server.log.')
            time.sleep(.25)
        else:raise RuntimeError('Startup took too long. Check data/server.log or ask Codex to inspect it.')
    if not args.no_browser:webbrowser.open(URL)
    print('Knowledge Browser is ready at '+URL)


if __name__=='__main__':
    try:main()
    except Exception as error:print(str(error));sys.exit(1)
