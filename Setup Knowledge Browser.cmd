@echo off
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" python -m venv .venv
if errorlevel 1 goto failed
".venv\Scripts\python.exe" -m pip install -r requirements-lock.txt
if errorlevel 1 goto failed
call npm ci
if errorlevel 1 goto failed
call npm run build
if errorlevel 1 goto failed
".venv\Scripts\python.exe" -m backend.cli bootstrap
if errorlevel 1 goto failed
echo Setup complete. Open Start Knowledge Browser.cmd.
pause
exit /b 0
:failed
echo Setup did not finish. Ask Codex to inspect the message above. Existing knowledge is preserved.
pause
exit /b 1
