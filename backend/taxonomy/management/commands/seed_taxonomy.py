from django.core.management.base import BaseCommand
from django.utils.text import slugify
from taxonomy.models import SkillCategory, SkillTag
from .seed_demo_data import CATEGORIES


class Command(BaseCommand):
    help = "Create missing approved taxonomy without creating or overwriting member profiles."

    def handle(self, *args, **options):
        for name, skills in CATEGORIES.items():
            category, _ = SkillCategory.objects.get_or_create(name=name, defaults={"slug": slugify(name)})
            for skill in skills:
                tag, _ = SkillTag.objects.get_or_create(category=category, slug=slugify(skill), defaults={"name": skill, "is_approved": True})
                aliases = {"Resume Review": ["resume", "cv", "curriculum vitae", "application feedback"], "React": ["reactjs", "react.js", "frontend", "front end"], "GitHub": ["git", "version control", "repository"], "Research Experience": ["research", "lab", "laboratory"], "Project Collaboration": ["collaborator", "collaboration", "team project"], "Figma": ["ux", "prototype", "prototyping"], "Interview Prep": ["interview", "behavioral"], "Consulting Prep": ["consulting", "case interview"]}.get(skill, [])
                if aliases and not tag.aliases:
                    tag.aliases = aliases
                    tag.save(update_fields=["aliases"])
        self.stdout.write("Approved skill taxonomy ready; no user accounts seeded.")
