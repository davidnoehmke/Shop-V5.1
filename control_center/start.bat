@echo off
cd /d "%~dp0.."
python -m pip install -r control_center\requirements.txt
python -m streamlit run control_center\app.py
pause
