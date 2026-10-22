"""Prepare the Docker workflow. Safe to run repeatedly: an existing .env is never changed."""
from pathlib import Path
import os
import secrets
import shutil
import socket
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


def env_value(name, default):
    """The value Compose will use: the shell environment first, then .env, then the default."""
    if os.environ.get(name):
        return os.environ[name]
    env = ROOT / '.env'
    for line in env.read_text().splitlines() if env.exists() else []:
        key, _, value = line.partition('=')
        if key.strip() == name and value.strip():
            return value.strip()
    return default


def port_holder(port):
    """None when the port is free or held by this project's containers; otherwise who holds it."""
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1', int(port))) != 0:
            return None
    project = env_value('COMPOSE_PROJECT_NAME', 'skillshare-local')
    found = subprocess.run(['docker', 'ps', '--filter', f'publish={port}', '--format', '{{.Label "com.docker.compose.project"}} {{.Names}}'],
                           capture_output=True, text=True).stdout.split()
    if found and found[0] == project:
        return None
    return found[1] if len(found) > 1 else 'another program'


def require_free_ports():
    problems = []
    for name, default, purpose in (('APP_PORT', '8080', 'the app'), ('MAIL_PORT', '8025', 'the local test inbox')):
        port = env_value(name, default)
        holder = port_holder(port)
        if holder:
            problems.append(f'Port {port} ({purpose}) is already used by {holder}. Stop it, or choose another port: {name}={int(port) + 1} make dev (or set {name} in .env).')
    if problems:
        sys.exit('\n'.join(problems))


if __name__ == '__main__':
    require_docker()
    write_env()
    if '--env-only' in sys.argv:
        require_free_ports()
    else:
        subprocess.run(['docker', 'compose', 'build'], cwd=ROOT, check=True)
        print('Setup complete. Run `make dev` to start Illini SkillShare.')
