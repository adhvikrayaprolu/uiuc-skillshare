from django.db import migrations, models
from django.utils import timezone


def mark_existing_profiles_announced(apps, schema_editor):
    # Profiles that existed before skill alerts must not trigger a burst of alerts on deploy.
    apps.get_model("profiles", "StudentProfile").objects.update(alerts_sent_at=timezone.now())


class Migration(migrations.Migration):

    dependencies = [
        ('profiles', '0005_studentprofile_learning_goals_public'),
    ]

    operations = [
        migrations.AddField(
            model_name='studentprofile',
            name='alerts_sent_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='studentprofile',
            name='digest_email_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='studentprofile',
            name='last_digest_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='studentprofile',
            name='skill_alerts_enabled',
            field=models.BooleanField(default=True),
        ),
        migrations.RunPython(mark_existing_profiles_announced, migrations.RunPython.noop),
    ]
