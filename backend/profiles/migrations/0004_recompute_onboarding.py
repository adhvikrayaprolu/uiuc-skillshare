from django.db import migrations, models


def recompute(apps, schema_editor):
    StudentProfile = apps.get_model("profiles", "StudentProfile")
    User = apps.get_model("accounts", "User")
    for profile in StudentProfile.objects.iterator():
        complete = bool(
            profile.display_name and profile.major and profile.year and profile.headline
            and profile.profile_skills.exists() and profile.learning_goals.exists()
            and (profile.availability.exists() or profile.availability_notes)
        )
        User.objects.filter(pk=profile.user_id).update(has_completed_onboarding=complete)


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_user_is_demo"),
        ("profiles", "0003_studentprofile_notification_email_enabled"),
    ]

    operations = [
        migrations.AlterField(model_name="studentprofile", name="bio", field=models.TextField(blank=True)),
        migrations.RunPython(recompute, migrations.RunPython.noop),
    ]
