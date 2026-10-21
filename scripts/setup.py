"""Prepare the Docker workflow. Safe to run repeatedly: an existing .env is never changed."""
from pathlib import Path
import secrets
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent


def require_docker():
    if not shutil.which('docker'):
        sys.exit('Docker is required: install Docker Desktop (or Docker Engine with Compose v2) and run this again.')
    if subprocess.run(['docker', 'compose', 'version'], capture_output=True).returncode:
        sys.exit('Docker Compose v2 is required (`docker compose`, not `docker-compose`).')
    if subprocess.run(['docker', 'info'], capture_output=True).returncode:
        sys.exit('Docker is installed but not running. Start Docker and run this again.')


def write_env():
    env, example = ROOT / '.env', ROOT / '.env.example'
    if env.exists():
        print('.env already exists; leaving it unchanged.')
        return
    # A fresh per-checkout key; the database passwords keep their local defaults so existing volumes still open.
    text = example.read_text().replace('dev-only-local-secret-key-change-before-production-12345', f'dev-only-{secrets.token_urlsafe(40)}')
    env.write_text(text)
    print('Created .env with local-only defaults.')


if __name__ == '__main__':
    require_docker()
    write_env()
    if '--env-only' not in sys.argv:
        subprocess.run(['docker', 'compose', 'build'], cwd=ROOT, check=True)
        print('Setup complete. Run `make dev` to start Illini SkillShare.')
