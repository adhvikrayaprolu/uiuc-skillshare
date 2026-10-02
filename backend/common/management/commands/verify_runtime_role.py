from django.core.management.base import BaseCommand, CommandError
from django.db import connection


class Command(BaseCommand):
    help = 'Verify the connected application role has DML access without ownership/DDL privileges.'

    def handle(self, *args, **options):
        with connection.cursor() as cursor:
            cursor.execute("SELECT current_user, rolsuper, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname=current_user")
            role, superuser, createdb, createrole=cursor.fetchone()
            cursor.execute("SELECT has_schema_privilege(current_user, current_schema(), 'CREATE'), (SELECT bool_and(has_table_privilege(current_user, 'accounts_user', permission)) FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']) permission), pg_has_role(current_user, (SELECT relowner FROM pg_class WHERE oid='accounts_user'::regclass), 'MEMBER')")
            ddl, dml, owns=cursor.fetchone()
        if superuser or createdb or createrole or ddl or owns or not dml:
            raise CommandError('Runtime role must have DML access without schema CREATE, owner membership or administrative privileges.')
        self.stdout.write(f'Runtime role {role}: DML access verified; schema DDL and administrative privileges absent.')
