from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify

from accounts.models import User
from discovery.services import rebuild_profile_search_index
from interactions.models import Endorsement, HelpRequest, Review, SavedProfile
from profiles.models import Availability, ContactMethod, Credential, ProfileSkill, StudentProfile
from taxonomy.models import SkillCategory, SkillTag

CATEGORIES = {
    "Technical": ["Python", "Java", "C++", "React", "SQL", "GitHub", "Excel", "Data Analysis", "Figma", "Hardware Projects"],
    "Career": [
        "Resume Review",
        "LinkedIn Feedback",
        "Interview Prep",
        "Consulting Prep",
        "Internship Search",
        "Networking Advice",
        "Portfolio Review",
    ],
    "Creative": ["Graphic Design", "Public Speaking", "Social Media", "Video Editing"],
    "Experience": ["Startup Experience", "Research Experience", "RSO Leadership", "Project Collaboration"],
    "Campus Life": [
        "Campus Advice",
        "Housing Advice",
        "Course Planning",
        "Transfer Student Advice",
        "International Student Advice",
    ],
    "Course": ["CS 124", "CS 128", "CS 225", "MATH 257", "STAT 107"],
}

# Main demo user + peers (email must be unique per user)
PROFILE_SPECS = [
    {
        "email": "adhvik.rayaprolu@illinois.edu",
        "first": "Adhvik",
        "last": "Rayaprolu",
        "major": "Math + CS",
        "year": "sophomore",
        "headline": "Math + CS student interested in software engineering, fintech, data science, and product building.",
        "bio": "I am building projects around student networking, data-driven applications, and career-focused tools. I am open to connecting with students working on software, product, data, startups, and career prep.",
        "interests": "software engineering, fintech, AI, data science, startups, product design, career prep",
        "skills": ["Python", "GitHub", "Data Analysis", "Project Collaboration", "SQL"],
        "contacts": [
            {"type": "email", "value": "adhvik.rayaprolu@illinois.edu", "is_public": True, "label": "Illinois email"},
            {"type": "github", "value": "https://github.com/adhvik-rayaprolu-demo", "is_public": True, "label": "GitHub"},
        ],
        "availability": [("wednesday", "evening", "Usually free after 6pm.")],
        "credentials": [
            {"credential_type": "resume", "title": "Resume", "url": "https://example.com/resume-adhvik.pdf", "visibility": "public"},
            {"credential_type": "github", "title": "GitHub", "url": "https://github.com/adhvik-rayaprolu-demo", "visibility": "public"},
        ],
        "preferred_contact_method": "email",
    },
    {
        "email": "riya.patel@illinois.edu",
        "first": "Riya",
        "last": "Patel",
        "major": "Computer Science",
        "year": "junior",
        "headline": "Product-minded CS student interested in design systems and startups.",
        "bio": "I help student teams turn ideas into prototypes and portfolio-ready case studies.",
        "interests": "design systems, React, Figma, startups",
        "skills": ["Figma", "React", "Startup Experience", "Resume Review", "Java"],
        "contacts": [
            {"type": "email", "value": "riya.patel@illinois.edu", "is_public": True, "label": "Email"},
            {"type": "linkedin", "value": "https://linkedin.com/in/riya-patel-demo", "is_public": True, "label": "LinkedIn"},
        ],
        "availability": [("monday", "evening", ""), ("friday", "afternoon", "")],
        "credentials": [
            {"credential_type": "portfolio", "title": "Portfolio", "url": "https://riyapatel-demo.example.com", "visibility": "public"},
            {"credential_type": "github", "title": "GitHub", "url": "https://github.com/riya-patel-demo", "visibility": "public"},
        ],
        "preferred_contact_method": "linkedin",
    },
    {
        "email": "daniel.kim@illinois.edu",
        "first": "Daniel",
        "last": "Kim",
        "major": "Statistics",
        "year": "senior",
        "headline": "Data-focused student with research and analytics experience.",
        "bio": "I can help with Python, SQL, analysis workflows, and research opportunities.",
        "interests": "statistics, ML, research",
        "skills": ["Python", "SQL", "Data Analysis", "Research Experience", "Excel"],
        "contacts": [
            {"type": "email", "value": "daniel.kim@illinois.edu", "is_public": True, "label": "Email"},
            {"type": "github", "value": "https://github.com/daniel-kim-demo", "is_public": True, "label": "GitHub"},
        ],
        "availability": [("saturday", "morning", ""), ("sunday", "afternoon", "")],
        "credentials": [
            {"credential_type": "resume", "title": "Resume", "url": "https://example.com/resume-daniel.pdf", "visibility": "public"},
            {"credential_type": "github", "title": "GitHub", "url": "https://github.com/daniel-kim-demo", "visibility": "public"},
        ],
        "preferred_contact_method": "email",
    },
    {
        "email": "maya.johnson@illinois.edu",
        "first": "Maya",
        "last": "Johnson",
        "major": "Information Sciences",
        "year": "sophomore",
        "headline": "Peer mentor interested in career prep and student organizations.",
        "bio": "I enjoy helping with resumes, LinkedIn, and RSO leadership.",
        "interests": "career prep, student orgs, public speaking",
        "skills": ["Resume Review", "LinkedIn Feedback", "RSO Leadership", "Public Speaking", "Networking Advice"],
        "contacts": [
            {"type": "email", "value": "maya.johnson@illinois.edu", "is_public": True, "label": "Email"},
            {"type": "linkedin", "value": "https://linkedin.com/in/maya-johnson-demo", "is_public": True, "label": "LinkedIn"},
        ],
        "availability": [("tuesday", "evening", ""), ("thursday", "evening", "")],
        "credentials": [
            {"credential_type": "resume", "title": "Resume", "url": "https://example.com/resume-maya.pdf", "visibility": "public"},
            {"credential_type": "linkedin", "title": "LinkedIn", "url": "https://linkedin.com/in/maya-johnson-demo", "visibility": "public"},
        ],
        "preferred_contact_method": "email",
    },
    {
        "email": "arjun.mehta@illinois.edu",
        "first": "Arjun",
        "last": "Mehta",
        "major": "Math + CS",
        "year": "junior",
        "headline": "Builder interested in GitHub workflows and project collaboration.",
        "bio": "Happy to help with repos, APIs, databases, and hackathon teams.",
        "interests": "systems, collaboration, backend",
        "skills": ["Python", "GitHub", "SQL", "Project Collaboration", "Java"],
        "contacts": [
            {"type": "email", "value": "arjun.mehta@illinois.edu", "is_public": True, "label": "Email"},
            {"type": "github", "value": "https://github.com/arjun-mehta-demo", "is_public": True, "label": "GitHub"},
        ],
        "availability": [("flexible", "evening", "Coordinate over email.")],
        "credentials": [
            {"credential_type": "github", "title": "GitHub", "url": "https://github.com/arjun-mehta-demo", "visibility": "public"},
            {"credential_type": "project", "title": "Course Projects", "url": "https://github.com/arjun-mehta-demo/projects", "visibility": "public"},
        ],
        "preferred_contact_method": "github",
    },
    {
        "email": "sofia.garcia@illinois.edu",
        "first": "Sofia",
        "last": "Garcia",
        "major": "Industrial Design",
        "year": "senior",
        "headline": "Designer helping students with portfolios, Figma, and visual storytelling.",
        "bio": "I specialize in visual design and portfolio reviews.",
        "interests": "design, branding, storytelling",
        "skills": ["Figma", "Graphic Design", "Portfolio Review", "Public Speaking", "Social Media"],
        "contacts": [
            {"type": "portfolio", "value": "https://sofiagarcia-demo.example.com", "is_public": True, "label": "Portfolio"},
            {"type": "email", "value": "sofia.garcia@illinois.edu", "is_public": True, "label": "Email"},
        ],
        "availability": [("wednesday", "afternoon", ""), ("saturday", "evening", "")],
        "credentials": [
            {"credential_type": "portfolio", "title": "Portfolio", "url": "https://sofiagarcia-demo.example.com", "visibility": "public"},
            {"credential_type": "resume", "title": "Resume", "url": "https://example.com/resume-sofia.pdf", "visibility": "public"},
        ],
        "preferred_contact_method": "email",
    },
    {
        "email": "emily.chen@illinois.edu",
        "first": "Emily",
        "last": "Chen",
        "major": "Business",
        "year": "junior",
        "headline": "Interested in consulting prep, interview strategy, and networking.",
        "bio": "Mock interviews, case practice, and resume feedback.",
        "interests": "consulting, networking, interviews",
        "skills": ["Consulting Prep", "Interview Prep", "Networking Advice", "Resume Review", "Excel"],
        "contacts": [
            {"type": "linkedin", "value": "https://linkedin.com/in/emily-chen-demo", "is_public": True, "label": "LinkedIn"},
            {"type": "email", "value": "emily.chen@illinois.edu", "is_public": True, "label": "Email"},
        ],
        "availability": [("monday", "afternoon", ""), ("thursday", "morning", "")],
        "credentials": [
            {"credential_type": "linkedin", "title": "LinkedIn", "url": "https://linkedin.com/in/emily-chen-demo", "visibility": "public"},
            {"credential_type": "resume", "title": "Resume", "url": "https://example.com/resume-emily.pdf", "visibility": "public"},
        ],
        "preferred_contact_method": "linkedin",
    },
    {
        "email": "omar.khan@illinois.edu",
        "first": "Omar",
        "last": "Khan",
        "major": "Computer Engineering",
        "year": "junior",
        "headline": "Interested in hardware projects, embedded systems, and collaboration.",
        "bio": "I can help with C++, circuits-adjacent software, and team projects.",
        "interests": "hardware, systems, robotics",
        "skills": ["Hardware Projects", "GitHub", "C++", "Project Collaboration", "Python"],
        "contacts": [
            {"type": "email", "value": "omar.khan@illinois.edu", "is_public": True, "label": "Email"},
            {"type": "github", "value": "https://github.com/omar-khan-demo", "is_public": True, "label": "GitHub"},
        ],
        "availability": [("friday", "evening", ""), ("sunday", "morning", "")],
        "credentials": [
            {"credential_type": "github", "title": "GitHub", "url": "https://github.com/omar-khan-demo", "visibility": "public"},
            {"credential_type": "project", "title": "Hardware Projects", "url": "https://github.com/omar-khan-demo/hardware", "visibility": "public"},
        ],
        "preferred_contact_method": "email",
    },
    {
        "email": "priya.shah@illinois.edu",
        "first": "Priya",
        "last": "Shah",
        "major": "Economics",
        "year": "senior",
        "headline": "Focused on internship search, recruiting, and consulting prep.",
        "bio": "Resume reviews, networking, and case practice.",
        "interests": "finance, consulting, recruiting",
        "skills": ["Internship Search", "Resume Review", "Networking Advice", "Consulting Prep", "Excel"],
        "contacts": [
            {"type": "linkedin", "value": "https://linkedin.com/in/priya-shah-demo", "is_public": True, "label": "LinkedIn"},
            {"type": "email", "value": "priya.shah@illinois.edu", "is_public": True, "label": "Email"},
        ],
        "availability": [("tuesday", "afternoon", ""), ("wednesday", "morning", "")],
        "credentials": [
            {"credential_type": "resume", "title": "Resume", "url": "https://example.com/resume-priya.pdf", "visibility": "public"},
            {"credential_type": "linkedin", "title": "LinkedIn", "url": "https://linkedin.com/in/priya-shah-demo", "visibility": "public"},
        ],
        "preferred_contact_method": "linkedin",
    },
    {
        "email": "lucas.brown@illinois.edu",
        "first": "Lucas",
        "last": "Brown",
        "major": "Information Systems",
        "year": "junior",
        "headline": "Data and systems student; Excel, SQL, and career prep.",
        "bio": "Happy to help with spreadsheets, SQL basics, and LinkedIn polish.",
        "interests": "analytics, IS, careers",
        "skills": ["Excel", "SQL", "Data Analysis", "LinkedIn Feedback", "Networking Advice"],
        "contacts": [
            {"type": "email", "value": "lucas.brown@illinois.edu", "is_public": True, "label": "Email"},
            {"type": "linkedin", "value": "https://linkedin.com/in/lucas-brown-demo", "is_public": True, "label": "LinkedIn"},
        ],
        "availability": [("monday", "evening", ""), ("thursday", "evening", "")],
        "credentials": [
            {"credential_type": "resume", "title": "Resume", "url": "https://example.com/resume-lucas.pdf", "visibility": "public"},
        ],
        "preferred_contact_method": "email",
    },
]


class Command(BaseCommand):
    help = "Seed Illini SkillSwap demo categories, skills, profiles, and interactions (idempotent)."

    def handle(self, *args, **options):
        skill_map = {}
        for category_name, tag_names in CATEGORIES.items():
            category, _ = SkillCategory.objects.get_or_create(
                name=category_name,
                defaults={"slug": slugify(category_name), "description": f"{category_name} skills and experiences."},
            )
            for tag_name in tag_names:
                skill, _ = SkillTag.objects.get_or_create(
                    category=category,
                    slug=slugify(tag_name),
                    defaults={"name": tag_name, "description": f"Help with {tag_name}.", "is_approved": True},
                )
                skill_map[tag_name] = skill

        profiles_by_email = {}
        for spec in PROFILE_SPECS:
            email = spec["email"]
            user, _ = User.objects.update_or_create(
                email=email,
                defaults={
                    "first_name": spec["first"],
                    "last_name": spec["last"],
                    "is_student_verified": True,
                    "has_completed_onboarding": True,
                },
            )
            display_name = f"{spec['first']} {spec['last']}"
            profile, _ = StudentProfile.objects.update_or_create(
                user=user,
                defaults={
                    "display_name": display_name,
                    "major": spec["major"],
                    "year": spec["year"],
                    "headline": spec["headline"],
                    "bio": spec["bio"],
                    "interests": spec["interests"],
                    "location": "Urbana-Champaign, IL",
                    "open_to_connect": True,
                    "visibility": "public",
                    "preferred_contact_method": spec.get("preferred_contact_method", "email"),
                    "availability_notes": "",
                },
            )

            # Replace child rows for idempotent re-seed of this profile
            profile.contact_methods.all().delete()
            for c in spec["contacts"]:
                ContactMethod.objects.create(
                    profile=profile,
                    type=c["type"],
                    value=c["value"],
                    label=c.get("label", ""),
                    is_public=c.get("is_public", True),
                )

            profile.availability.all().delete()
            for day, time_block, notes in spec["availability"]:
                Availability.objects.create(profile=profile, day_of_week=day, time_block=time_block, notes=notes or "")

            profile.credentials.all().delete()
            for cred in spec["credentials"]:
                Credential.objects.create(
                    profile=profile,
                    credential_type=cred["credential_type"],
                    title=cred["title"],
                    url=cred.get("url") or "",
                    visibility=cred.get("visibility", "public"),
                )

            profile.profile_skills.all().delete()
            for pos, tag_name in enumerate(spec["skills"][:5]):
                sk = skill_map.get(tag_name)
                if not sk:
                    self.stdout.write(self.style.WARNING(f"Missing skill tag: {tag_name} for {email}"))
                    continue
                ProfileSkill.objects.create(
                    profile=profile,
                    skill=sk,
                    confidence_level="advanced" if pos == 0 else "intermediate",
                    description=f"Experience with {tag_name}.",
                    is_featured=pos < 2,
                )

            profile.update_profile_completeness()
            rebuild_profile_search_index(profile)
            profiles_by_email[email] = profile

        demo_emails = list(profiles_by_email.keys())
        HelpRequest.objects.filter(Q(seeker__email__in=demo_emails) | Q(helper_profile__user__email__in=demo_emails)).delete()

        adhvik = profiles_by_email["adhvik.rayaprolu@illinois.edu"]
        riya = profiles_by_email["riya.patel@illinois.edu"]
        maya = profiles_by_email["maya.johnson@illinois.edu"]
        daniel = profiles_by_email["daniel.kim@illinois.edu"]
        sofia = profiles_by_email["sofia.garcia@illinois.edu"]

        SavedProfile.objects.update_or_create(
            seeker=adhvik.user,
            saved_profile=riya,
            defaults={"note": "Design and product"},
        )
        SavedProfile.objects.update_or_create(
            seeker=adhvik.user,
            saved_profile=daniel,
            defaults={"note": "Data / stats help"},
        )

        now = timezone.now()
        HelpRequest.objects.create(
            seeker=adhvik.user,
            helper_profile=riya,
            topic="Figma portfolio feedback",
            message="Could you review my portfolio screens before a career fair?",
            related_skill=skill_map.get("Figma"),
            urgency=HelpRequest.Urgency.MEDIUM,
            preferred_contact_method="email",
            status=HelpRequest.Status.PENDING,
        )
        HelpRequest.objects.create(
            seeker=adhvik.user,
            helper_profile=maya,
            topic="RSO leadership advice",
            message="I'd like advice on balancing coursework and club leadership.",
            related_skill=skill_map.get("RSO Leadership"),
            urgency=HelpRequest.Urgency.LOW,
            preferred_contact_method="email",
            status=HelpRequest.Status.ACCEPTED,
            accepted_at=now,
        )
        HelpRequest.objects.create(
            seeker=adhvik.user,
            helper_profile=daniel,
            topic="SQL study plan",
            message="Help me structure practice for interviews.",
            related_skill=skill_map.get("SQL"),
            urgency=HelpRequest.Urgency.MEDIUM,
            preferred_contact_method="email",
            status=HelpRequest.Status.COMPLETED,
            accepted_at=now,
            completed_at=now,
        )
        HelpRequest.objects.create(
            seeker=sofia.user,
            helper_profile=adhvik,
            topic="Quick chat about student networking app",
            message="Would love 15 minutes to compare notes on a campus project.",
            urgency=HelpRequest.Urgency.LOW,
            preferred_contact_method="email",
            status=HelpRequest.Status.PENDING,
        )

        Review.objects.update_or_create(
            reviewer=daniel.user,
            profile=adhvik,
            defaults={"rating": 5, "comment": "Great collaborator — clear communicator.", "related_skill": skill_map.get("Python")},
        )
        Review.objects.update_or_create(
            reviewer=maya.user,
            profile=riya,
            defaults={"rating": 5, "comment": "Amazing Figma feedback session.", "related_skill": skill_map.get("Figma")},
        )

        for prof in (riya, daniel, maya):
            skill = prof.profile_skills.first()
            if skill:
                Endorsement.objects.get_or_create(
                    endorser=adhvik.user,
                    profile=prof,
                    skill=skill.skill,
                    defaults={"note": "Helpful peer."},
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {SkillCategory.objects.count()} categories, {SkillTag.objects.count()} skills, "
                f"{StudentProfile.objects.count()} profiles, demo interactions for Adhvik and peers."
            )
        )
