"""Start both local servers; Ctrl-C stops both without leaving child processes."""
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

root=Path(__file__).resolve().parent.parent
os.chdir(root / 'backend')
for args in [('migrate',), ('seed_demo_data',)]:
    subprocess.run([sys.executable, 'manage.py', *args], check=True)
processes = []
try:
    processes.append(subprocess.Popen([sys.executable, 'manage.py', 'runserver', '127.0.0.1:8000', '--noreload'], start_new_session=True))
    processes.append(subprocess.Popen(['npm', '--prefix', str(root / 'frontend'), 'run', 'dev', '--', '--host', '127.0.0.1'], start_new_session=True))
    print('Illini SkillSwap: http://127.0.0.1:5173 — Ctrl-C stops both servers', flush=True)
    while all(p.poll() is None for p in processes):
        time.sleep(.5)
    raise SystemExit(next((p.returncode or 1 for p in processes if p.poll() is not None), 1))
except KeyboardInterrupt:
    pass
finally:
    for p in processes:
        if p.poll() is None:
            os.killpg(p.pid, signal.SIGTERM)
    for p in processes:
        try: p.wait(timeout=5)
        except subprocess.TimeoutExpired: os.killpg(p.pid, signal.SIGKILL); p.wait()
