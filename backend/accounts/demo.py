"""Deterministic local demo network: one demo member, a demo moderator and fictional peers.

Every person here is invented. Accounts use the reserved `.demo@illinois.edu` suffix so they
are easy to recognise and remove. Settings refuse DEMO_MODE outside ENVIRONMENT=local.
"""
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from common.models import Notification
from discovery.services import rebuild_profile_search_index
from interactions.models import Endorsement, HelpRequest, Review, SavedProfile
from profiles.models import Availability, ContactMethod, ProfileSkill, StudentProfile
from taxonomy.models import SkillTag

from .models import User

DEMO_SUFFIX = ".demo@illinois.edu"
DEMO_EMAIL = f"alex.rivera{DEMO_SUFFIX}"
STAFF_EMAIL = f"moderator{DEMO_SUFFIX}"

# (first, last, major, year, headline, bio, teaches [(skill, level, note)], goals, goals public, availability)
MEMBERS = [
    ("Alex", "Rivera", "Computer Science", "junior",
     "CS junior who likes turning messy data into clear answers",
     "I TA for an intro data course and build small tools for my RSO. Happy to pair on Python or SQL in exchange for design or interview help.",
     [("Python", "advanced", "Two years of coursework plus a data-cleaning toolkit for my RSO."),
      ("SQL", "intermediate", "Wrote the queries behind our club's membership dashboard."),
      ("Data Analysis", "intermediate", "pandas, notebooks and plain-language summaries.")],
     ["Figma", "Public Speaking", "Interview Prep"], True, [("tuesday", "evening"), ("thursday", "evening"), ("saturday", "afternoon")]),
    ("Sam", "Okafor", "Information Sciences", "senior",
     "UX designer who prototypes everything in Figma first",
     "I run design critiques for an RSO and love helping people get from blank canvas to clickable prototype.",
     [("Figma", "advanced", "Design lead for two campus apps."), ("Graphic Design", "intermediate", "")],
     ["Python"], True, [("monday", "evening"), ("wednesday", "afternoon")]),
    ("Priya", "Natarajan", "Statistics", "junior",
     "Interview-prep nerd with two internship offers behind me",
     "I've done 40+ mock interviews and keep a shared bank of behavioral questions.",
     [("Interview Prep", "advanced", "Mock behavioral and technical screens."), ("Resume Review", "intermediate", ""), ("STAT 107", "advanced", "")],
     ["SQL"], True, [("tuesday", "afternoon"), ("friday", "morning")]),
    ("Jordan", "Lee", "Communication", "sophomore",
     "Speech team captain who can make any talk less scary",
     "Competitive speech for four years. I coach classmates before presentations and pitch competitions.",
     [("Public Speaking", "advanced", "Speech team captain; I run weekly practice rounds."), ("Social Media", "intermediate", "")],
     ["Data Analysis"], True, [("wednesday", "evening"), ("sunday", "afternoon")]),
    ("Mei", "Chen", "Computer Engineering", "senior",
     "Embedded systems and late-night CS 225 debugging",
     "I've TA'd CS 225 and build hardware side projects with Arduino and FPGAs.",
     [("C++", "advanced", ""), ("CS 225", "advanced", "Former course assistant."), ("Hardware Projects", "intermediate", "")],
     ["Figma"], False, [("monday", "night"), ("thursday", "night")]),
    ("Diego", "Martinez", "Finance", "junior",
     "Consulting club VP who has run 100+ case interviews",
     "I help people structure case answers and build Excel models that don't break.",
     [("Consulting Prep", "advanced", ""), ("Excel", "advanced", ""), ("Networking Advice", "intermediate", "")],
     ["Python"], True, [("tuesday", "morning"), ("thursday", "afternoon")]),
    ("Hannah", "Schultz", "Graphic Design", "senior",
     "Portfolio reviews and video edits for career fairs",
     "I review portfolios for the design society and edit promo videos for RSOs.",
     [("Portfolio Review", "advanced", ""), ("Video Editing", "intermediate", ""), ("Graphic Design", "advanced", "")],
     ["Public Speaking"], True, [("flexible", "evening")]),
    ("Marcus", "Johnson", "Mathematics", "graduate",
     "Math grad student who enjoys linear algebra office hours",
     "I explain MATH 257 with pictures first and proofs second, and can talk about research life.",
     [("MATH 257", "advanced", ""), ("Research Experience", "advanced", ""), ("Course Planning", "intermediate", "")],
     ["Interview Prep"], False, [("monday", "afternoon"), ("wednesday", "afternoon")]),
    ("Aisha", "Rahman", "Computer Science", "freshman",
     "International student happy to share what I learned the hard way",
     "First year at Illinois. I can help with campus logistics and Java basics.",
     [("International Student Advice", "advanced", ""), ("Campus Advice", "intermediate", ""), ("Java", "intermediate", "")],
     ["Python", "CS 225"], True, [("saturday", "morning")]),
    ("Ethan", "Park", "Industrial Engineering", "senior",
     "Startup founder building with React on the side",
     "Co-founded a campus startup through iVenture. I like helping teams scope projects and ship.",
     [("Startup Experience", "advanced", ""), ("React", "intermediate", ""), ("Project Collaboration", "advanced", "")],
     ["SQL"], True, [("friday", "afternoon")]),
    ("Lena", "Novak", "Psychology", "junior",
     "Research assistant and RSO president",
     "I've worked in two psych labs and lead a 60-person RSO. Ask me about getting into research.",
     [("Research Experience", "intermediate", ""), ("RSO Leadership", "advanced", ""), ("Public Speaking", "intermediate", "")],
     ["Data Analysis"], False, [("tuesday", "evening")]),
    ("Tomás", "Alvarez", "Economics", "senior",
     "Transfer student who figured out internships the long way",
     "Transferred from Parkland. I help with LinkedIn, internship searches and housing questions.",
     [("Transfer Student Advice", "advanced", ""), ("LinkedIn Feedback", "intermediate", ""), ("Internship Search", "intermediate", "")],
     ["Excel"], True, [("monday", "evening"), ("sunday", "evening")]),
    ("Grace", "Kim", "Computer Science", "sophomore",
     "Frontend developer who loves GitHub workflows",
     "I maintain a few open-source React components and help classmates untangle git.",
     [("React", "advanced", ""), ("GitHub", "advanced", ""), ("CS 128", "intermediate", "")],
     ["Interview Prep"], True, [("wednesday", "evening"), ("saturday", "evening")]),
]


def demo_email(first, last):
    return f"{first.lower().replace('á', 'a')}.{last.lower()}{DEMO_SUFFIX}"


def _skill(name):
    return SkillTag.objects.get(name=name, is_approved=True)


def _member(spec, now, joined):
    first, last, major, year, headline, bio, teaches, goals, goals_public, slots = spec
    user = User.objects.create_user(email=demo_email(first, last), first_name=first, last_name=last,
                                    is_student_verified=True, has_completed_onboarding=True, date_joined=joined)
    profile = StudentProfile.objects.create(
        user=user, display_name=f"{first} {last}", major=major, year=year, headline=headline, bio=bio,
        location="Urbana-Champaign, IL", visibility="public", open_to_connect=True,
        learning_goals_public=goals_public, share_contacts=True, alerts_sent_at=now,
        availability_confirmed_at=now,
    )
    for position, (name, level, note) in enumerate(teaches):
        ProfileSkill.objects.create(profile=profile, skill=_skill(name), confidence_level=level, description=note, is_featured=position == 0)
    profile.learning_goals.set([_skill(name) for name in goals])
    for day, block in slots:
        Availability.objects.create(profile=profile, day_of_week=day, time_block=block)
    ContactMethod.objects.create(profile=profile, type="email", label="Illinois email", value=user.email, is_public=True)
    profile.update_profile_completeness()
    return profile


def _request(seeker, helper, kind, wants, offers, topic, message, status, created, **times):
    request = HelpRequest.objects.create(
        seeker=seeker.user, helper_profile=helper, kind=kind, related_skill=_skill(wants),
        offered_skill=_skill(offers) if offers else None, topic=topic, message=message, status=status,
        expires_at=created + HelpRequest.PENDING_LIFETIME if status == HelpRequest.Status.PENDING else None,
        version=1 + len(times), **times,
    )
    HelpRequest.objects.filter(pk=request.pk).update(created_at=created, updated_at=max([created, *times.values()]))
    return request


def _feedback(request, reviewer, target, skill, rating, comment, when):
    review = Review.objects.create(reviewer=reviewer.user, profile=target, help_request=request, rating=rating, comment=comment, related_skill=_skill(skill))
    endorsement = Endorsement.objects.create(endorser=reviewer.user, profile=target, skill=_skill(skill), help_request=request)
    Review.objects.filter(pk=review.pk).update(created_at=when, updated_at=when)
    Endorsement.objects.filter(pk=endorsement.pk).update(created_at=when)


def _notify(recipient, peer, request, kind, title, when, read):
    note = Notification.objects.create(recipient=recipient.user, peer=peer.user, help_request=request, kind=kind,
                                       title=title, event_key=f"demo:{request.pk}:{kind}", read_at=when if read else None)
    Notification.objects.filter(pk=note.pk).update(created_at=when)


def remove_demo_network():
    return User.objects.filter(email__endswith=DEMO_SUFFIX).delete()[0]


@transaction.atomic
def seed_demo_network(reset=False):
    """Create the demo network once; with reset, rebuild it from scratch. Returns True when created."""
    if not settings.DEMO_MODE:
        raise RuntimeError("Demo data requires ENVIRONMENT=local and DEMO_MODE=true.")
    if reset:
        remove_demo_network()
    elif User.objects.filter(email=DEMO_EMAIL).exists():
        return False
    now = timezone.now().replace(microsecond=0)
    # Members joined over the past few weeks, so time-based launch metrics have data.
    people = {spec[0]: _member(spec, now, now - timedelta(days=40 - 2 * index)) for index, spec in enumerate(MEMBERS)}
    alex, sam, priya, jordan = people["Alex"], people["Sam"], people["Priya"], people["Jordan"]
    swap, help_ = HelpRequest.Kind.SWAP, HelpRequest.Kind.HELP
    status = HelpRequest.Status
    days = lambda n, hours=0: now - timedelta(days=n, hours=hours)  # noqa: E731

    incoming = _request(jordan, alex, swap, "Data Analysis", "Public Speaking", "Speech practice for help reading survey data",
                        "Hey Alex! I'm analysing our club's survey for a pitch and could use a hand with pandas. Happy to run a couple of practice sessions for your next presentation in return.",
                        status.PENDING, days(1, 3))
    aisha_ask = _request(people["Aisha"], alex, help_, "Python", None, "Debugging my first Python project",
                         "My CS 124 side project keeps crashing on file input. Could you look at it with me for 20 minutes?",
                         status.PENDING, days(0, 5))
    active = _request(alex, sam, swap, "Figma", "Python", "Figma basics for a Python automation script",
                      "I'd love to learn enough Figma to mock up my RSO's app. I can help you automate that spreadsheet cleanup in Python.",
                      status.ACCEPTED, days(4), accepted_at=days(3))
    done = _request(alex, priya, swap, "Interview Prep", "SQL", "Mock interviews for SQL practice",
                    "Could we trade a mock behavioral interview for a SQL review session?",
                    status.COMPLETED, days(12), accepted_at=days(11), completed_at=days(6))
    _feedback(done, alex, priya, "Interview Prep", 5, "Priya's mock interview was more useful than the career fair workshop. Clear, honest feedback.", days(5))
    _feedback(done, priya, alex, "SQL", 5, "Alex explained window functions with my own data. I finally get GROUP BY.", days(5))
    helped = _request(people["Grace"], alex, help_, "Python", None, "Python for a data structures warm-up",
                      "Can you walk me through list comprehensions before my CS 128 exam?", status.COMPLETED,
                      days(20), accepted_at=days(19), completed_at=days(17))
    _feedback(helped, people["Grace"], alex, "Python", 5, "Patient and well prepared. Brought practice problems!", days(16))
    _request(alex, people["Marcus"], help_, "MATH 257", None, "Eigenvalues before the midterm",
             "I keep mixing up eigenvectors and eigenspaces. Could you do a quick review?", status.COMPLETED,
             days(10), accepted_at=days(9), completed_at=days(8))
    _request(alex, people["Hannah"], help_, "Portfolio Review", None, "Portfolio check before the career fair",
             "Would you look over my project page layout? Ten minutes would help a lot.", status.PENDING, days(2))
    peers = _request(people["Ethan"], people["Mei"], help_, "CS 225", None, "Graph traversal review",
                     "Could you help me review BFS vs DFS?", status.COMPLETED, days(15), accepted_at=days(14), completed_at=days(13))
    _feedback(peers, people["Ethan"], people["Mei"], "CS 225", 5, "Mei drew every step on the whiteboard. Super clear.", days(12))
    peers = _request(people["Tomás"], people["Diego"], help_, "Excel", None, "Excel modelling basics",
                     "Can you show me how you structure a three-statement model?", status.COMPLETED, days(9), accepted_at=days(8), completed_at=days(7))
    _feedback(peers, people["Tomás"], people["Diego"], "Excel", 4, "Great walkthrough, and he shared his template.", days(6))

    for saved in (people["Hannah"], people["Mei"]):
        SavedProfile.objects.create(seeker=alex.user, saved_profile=saved)
    _notify(alex, jordan, incoming, "created", "New swap proposal", days(1, 3), read=False)
    _notify(alex, people["Aisha"], aisha_ask, "created", "New help request", days(0, 5), read=False)
    _notify(alex, sam, active, "accepted", "Swap accepted", days(3), read=True)
    _notify(alex, priya, done, "reviewed", "New interaction feedback", days(5), read=True)

    staff = User.objects.create_user(email=STAFF_EMAIL, first_name="Demo", last_name="Moderator", is_staff=True,
                                     is_student_verified=True, has_completed_onboarding=True)
    profile = StudentProfile.objects.create(user=staff, display_name="Demo Moderator", major="Staff", year="other",
                                            headline="Local demo moderator account", visibility="private", open_to_connect=False)
    profile.learning_goals.set([_skill("Campus Advice")])
    ProfileSkill.objects.create(profile=profile, skill=_skill("Campus Advice"), confidence_level="advanced")
    Availability.objects.create(profile=profile, day_of_week="flexible", time_block="flexible")

    for member in people.values():
        rebuild_profile_search_index(member)
    return True
