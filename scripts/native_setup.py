"""Create the native environment without overwriting user configuration. Safe to run repeatedly."""
from pathlib import Path
import shutil
import subprocess
import os
import sys

os.chdir(Path(__file__).resolve().parent.parent)
venv = Path('backend/.venv')
python = venv / 'bin' / 'python'


def venv_works():
    # A virtualenv left over from another Python install can start but fail to import compiled modules.
    probe = subprocess.run([str(python), '-c', 'import ctypes, sqlite3, ssl'], capture_output=True)
    return probe.returncode == 0


if not python.exists():
    subprocess.run([sys.executable, '-m', 'venv', str(venv)], check=True)
elif not venv_works():
    print('backend/.venv was built with a different Python and is broken; rebuilding it.')
    subprocess.run([sys.executable, '-m', 'venv', '--clear', str(venv)], check=True)
subprocess.run([str(python), '-m', 'pip', 'install', '-r', 'backend/requirements.txt'], check=True)
subprocess.run(['npm', '--prefix', 'frontend', 'ci'], check=True)
destination = Path('backend/.env')
if not destination.exists():
    shutil.copyfile('backend/.env.example', destination)
print('Native setup complete. Run make native-dev for editing; make check uses the canonical Docker baseline.')
