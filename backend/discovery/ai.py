import os
from difflib import SequenceMatcher

from taxonomy.models import SkillTag


def get_embedding(text):
    if not os.getenv("OPENAI_API_KEY"):
        return None
    return None


def semantic_similarity(query, text):
    return SequenceMatcher(None, (query or "").lower(), (text or "").lower()).ratio()


def suggest_tags_from_text(text):
    lowered = (text or "").lower()
    matches = []
    for skill in SkillTag.objects.filter(is_approved=True).select_related("category"):
        if skill.name.lower() in lowered:
            matches.append(skill)
    if matches:
        return matches[:8]
    words = {word.strip(".,;:!?()[]").lower() for word in lowered.split() if len(word) > 3}
    return list(SkillTag.objects.filter(name__iregex="|".join(words) if words else "$^")[:8])
