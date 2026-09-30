"""Create local environment without overwriting user configuration."""
from pathlib import Path
import shutil
import subprocess
import os
os.chdir(Path(__file__).resolve().parent.parent)
subprocess.run(['python3','-m','venv','backend/.venv'],check=True)
subprocess.run(['backend/.venv/bin/pip','install','-r','backend/requirements.txt'],check=True)
subprocess.run(['npm','--prefix','frontend','ci'],check=True)
for folder in ('backend','frontend'):
    destination=Path(folder)/'.env'
    if not destination.exists(): shutil.copyfile(Path(folder)/'.env.example',destination)
print('Setup complete. Run make dev.')
