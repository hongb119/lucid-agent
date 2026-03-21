@echo off
echo Starting Phonetics FastAPI Server on port 8001...
cd /d c:\lucid-agent\backend
python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload
pause
