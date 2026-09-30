"""Run the repository's canonical checks, stopping at the first failure."""
from pathlib import Path
import subprocess
import sys
root=Path(__file__).resolve().parent.parent
for command in [('check',),('makemigrations','--check','--dry-run'),('test',)]:
    subprocess.run([sys.executable,'manage.py',*command],cwd=root/'backend',check=True)
for script in ('test','lint','build'):
    subprocess.run(['npm','run',script],cwd=root/'frontend',check=True)
