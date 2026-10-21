"""Create local environment without overwriting user configuration."""
from pathlib import Path
import shutil
import subprocess
import os
os.chdir(Path(__file__).resolve().parent.parent)
subprocess.run(['python3','-m','venv','backend/.venv'],check=True)
subprocess.run(['backend/.venv/bin/pip','install','-r','backend/requirements.txt'],check=True)
subprocess.run(['npm','--prefix','frontend','ci'],check=True)
destination=Path('backend/.env')
if not destination.exists(): shutil.copyfile('backend/.env.example',destination)
print('Native setup complete. Run make native-dev for editing; make check uses the canonical Docker baseline.')
