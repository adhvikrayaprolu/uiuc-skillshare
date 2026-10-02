from django.db import migrations


def create_index(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute("CREATE INDEX skillshare_search_english_gin ON discovery_profilesearchindex USING GIN (to_tsvector('english', COALESCE(search_text, '')))")


def drop_index(apps, schema_editor):
    if schema_editor.connection.vendor == "postgresql":
        schema_editor.execute("DROP INDEX IF EXISTS skillshare_search_english_gin")


class Migration(migrations.Migration):
    dependencies = [("discovery", "0001_initial")]
    operations = [migrations.RunPython(create_index, drop_index)]
