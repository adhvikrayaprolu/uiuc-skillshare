"""Fresh private-schema migrations and backup/restore, exclusively in local Compose."""
from pathlib import Path
import json
import subprocess
import tempfile
import time

ROOT=Path(__file__).resolve().parents[2]
SCHEMA=(ROOT/'scripts/database/supabase-schema.sql').read_bytes()
PREFIX=f'skillshare_rehearsal_{int(time.time())}'
DATABASES=[PREFIX+'_fresh', PREFIX+'_restore']

def run(args, **kwargs):
    return subprocess.run(['docker','compose',*args], cwd=ROOT, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, **kwargs).stdout

def sql(database, text):
    return run(['exec','-T','db','psql','-X','-q','-t','-A','-v','ON_ERROR_STOP=1','-U','skillshare','-d',database], input=text if isinstance(text,bytes) else text.encode())

def django(database, *command, role='skillshare_app', migrate=False):
    # Passwords remain inside the container environment; never echo/print connection strings.
    body = """import os, sys
from urllib.parse import urlsplit, urlunsplit
p = urlsplit(os.environ['DATABASE_URL'])
os.environ['DATABASE_URL'] = urlunsplit((p.scheme, p.netloc, '/' + sys.argv[1], '', ''))
os.environ['DB_SCHEMA'] = 'skillshare'
os.environ['DB_MIGRATION_ROLE'] = 'skillshare_migrate' if sys.argv[2] == 'migrate' else ''
os.environ['DJANGO_SETTINGS_MODULE'] = 'skillswap_backend.settings'
from django.core.management import execute_from_command_line
execute_from_command_line(['manage.py', *sys.argv[3:]])
"""
    arguments = ['python', '-c', body, database, 'migrate' if migrate else 'runtime', *command]
    if role == 'admin':
        return run(['run', '--no-deps', '--rm', '-T', 'migrate', *arguments])
    return run(['exec', '-T', 'app', *arguments])


# The local Compose layout is the guard: the service must explicitly report local settings.
local=json.loads(run(['exec','-T','app','python','-c','from skillswap_backend import settings; import json; print(json.dumps({"local":settings.LOCAL_DEVELOPMENT,"host":settings.DATABASES["default"].get("HOST"),"name":settings.DATABASES["default"].get("NAME")}))']))
if local != {'local':True,'host':'db','name':'skillshare'}:
    raise SystemExit('Refusing rehearsal outside the local Compose database.')
created_roles=[]
stage='roles'
try:
    for role in ['skillshare_migrate','anon','authenticated','service_role']:
        exists=sql('skillshare',f"SELECT 1 FROM pg_roles WHERE rolname='{role}';").decode().strip()
        if exists != '1':
            sql('skillshare',f'CREATE ROLE {role} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;')
            created_roles.append(role)
    stage='scratch database schema'
    for database in DATABASES:
        sql('skillshare',f'CREATE DATABASE {database};')
        sql(database,SCHEMA)
    stage='private-schema migrations'
    django(DATABASES[0],'migrate','--noinput',role='admin',migrate=True)
    django(DATABASES[0],'seed_taxonomy',role='admin',migrate=True)
    django(DATABASES[0],'verify_runtime_role')
    django(DATABASES[0],'shell','-c', "from accounts.models import User; from profiles.models import StudentProfile; u=User.objects.create_user(email='rehearsal@example.invalid'); StudentProfile.objects.create(user=u,display_name='Local restore fixture',major='Test',year='other',headline='Restore fixture',bio='Synthetic private fixture',visibility='private')")
    stage='backup and restore'
    with tempfile.TemporaryDirectory(prefix='skillshare-rehearsal-') as temporary:
        backup=Path(temporary)/'rehearsal.dump'
        backup.write_bytes(run(['exec','-T','db','pg_dump','-U','skillshare','-d',DATABASES[0],'-Fc','--schema=skillshare','--no-owner','--no-privileges']))
        sql(DATABASES[1], f'GRANT CREATE ON DATABASE {DATABASES[1]} TO skillshare_migrate;')
        run(['exec','-T','db','pg_restore','-U','skillshare','-d',DATABASES[1],'--role=skillshare_migrate','--clean','--if-exists','--no-owner','--no-privileges','--exit-on-error'],input=backup.read_bytes())
    sql(DATABASES[1], f'REVOKE CREATE ON DATABASE {DATABASES[1]} FROM skillshare_migrate;')
    stage='restore verification'
    sql(DATABASES[1],SCHEMA)
    django(DATABASES[1],'verify_runtime_role')
    django(DATABASES[1],'check')
    django(DATABASES[1],'shell','-c', "from accounts.models import User; from profiles.models import StudentProfile; from taxonomy.models import SkillTag; assert User.objects.count()==1 and StudentProfile.objects.get().visibility=='private' and SkillTag.objects.count()==35; print('Restore contents verified.')")
    # Prove browser Data API roles have no schema/table privileges, including future migrations.
    result=sql(DATABASES[1],"SELECT bool_and(NOT has_schema_privilege(rolname,'skillshare','USAGE') AND NOT has_table_privilege(rolname,'skillshare.accounts_user','SELECT')) FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role');").decode()
    if result.strip() != 't':
        raise RuntimeError('Browser Data API role grants failed verification.')
    print('Local private-schema migration, runtime privileges, Data API grants and backup/restore passed. Hosted Supabase remains unverified.')
except subprocess.CalledProcessError as error:
    # Log a safe stage marker, never a connection string or echoed SQL/password.
    raise SystemExit(f'Local database rehearsal failed during {stage} (exit {error.returncode}); inspect the disposable stage before retrying.') from None
finally:
    for database in DATABASES:
        sql('skillshare',f'DROP DATABASE IF EXISTS {database} WITH (FORCE);')
    for role in reversed(created_roles):
        sql('skillshare',f'DROP ROLE IF EXISTS {role};')
