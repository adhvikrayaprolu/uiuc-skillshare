"""Two-way skill overlap between a viewer and another member.

Another member's learning goals are only consulted when they chose to make them public.
"""


def _named(rows):
    return [{"id": skill.id, "name": skill.name} for skill in sorted(rows, key=lambda skill: skill.name.casefold())]


def viewer_sets(viewer):
    mine = getattr(viewer, "profile", None)
    if not mine:
        return None, set(), set()
    goals = set(mine.learning_goals.filter(is_approved=True).values_list("id", flat=True))
    skills = set(mine.profile_skills.filter(skill__is_approved=True).values_list("skill_id", flat=True))
    return mine, goals, skills


def swap_summary(viewer, profile, sets=None):
    mine, my_goals, my_skills = sets or viewer_sets(viewer)
    if not mine or mine.pk == profile.pk:
        return None
    offered = [row.skill for row in profile.profile_skills.select_related("skill") if row.skill.is_approved]
    they_teach = [skill for skill in offered if skill.id in my_goals]
    you_teach = list(profile.learning_goals.filter(is_approved=True, id__in=my_skills)) if profile.learning_goals_public else []
    return {
        "they_teach_you": _named(they_teach),
        "you_can_teach": _named(you_teach),
        "is_mutual": bool(they_teach and you_teach),
    }
