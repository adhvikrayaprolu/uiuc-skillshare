from django.conf import settings
from django.db import models


class StudentProfile(models.Model):
    class Year(models.TextChoices):
        FRESHMAN = "freshman", "Freshman"
        SOPHOMORE = "sophomore", "Sophomore"
        JUNIOR = "junior", "Junior"
        SENIOR = "senior", "Senior"
        GRADUATE = "graduate", "Graduate"
        ALUMNI = "alumni", "Alumni"
        OTHER = "other", "Other"

    class ContactType(models.TextChoices):
        EMAIL = "email", "Email"
        PHONE = "phone", "Phone"
        INSTAGRAM = "instagram", "Instagram"
        LINKEDIN = "linkedin", "LinkedIn"
        GITHUB = "github", "GitHub"
        PORTFOLIO = "portfolio", "Portfolio"
        WEBSITE = "website", "Website"
        OTHER = "other", "Other"

    class Visibility(models.TextChoices):
        PUBLIC = "public", "Public"
        PRIVATE = "private", "Private"

    user = models.OneToOneField(settings.AUTH_USER_MODEL, related_name="profile", on_delete=models.CASCADE)
    display_name = models.CharField(max_length=160)
    major = models.CharField(max_length=160)
    year = models.CharField(max_length=20, choices=Year.choices)
    headline = models.CharField(max_length=255)
    bio = models.TextField()
    interests = models.TextField(blank=True)
    location = models.CharField(max_length=160, blank=True)
    profile_picture = models.ImageField(upload_to="profile_pictures/", blank=True, null=True)
    open_to_connect = models.BooleanField(default=True)
    preferred_contact_method = models.CharField(max_length=20, choices=ContactType.choices, default=ContactType.EMAIL)
    availability_notes = models.TextField(blank=True)
    visibility = models.CharField(max_length=20, choices=Visibility.choices, default=Visibility.PUBLIC)
    profile_completeness = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-profile_completeness", "display_name"]

    def calculate_profile_completeness(self):
        score = 0
        if all([self.display_name, self.major, self.year, self.headline]):
            score += 20
        if self.bio:
            score += 15
        if self.profile_skills.count() >= 3:
            score += 25
        if self.availability.exists() or self.availability_notes:
            score += 15
        if self.contact_methods.filter(is_public=True).exists():
            score += 15
        if self.credentials.exists():
            score += 10
        return min(score, 100)

    def update_profile_completeness(self):
        self.profile_completeness = self.calculate_profile_completeness()
        self.save(update_fields=["profile_completeness", "updated_at"])

    def __str__(self):
        return self.display_name


class ContactMethod(models.Model):
    profile = models.ForeignKey(StudentProfile, related_name="contact_methods", on_delete=models.CASCADE)
    type = models.CharField(max_length=20, choices=StudentProfile.ContactType.choices)
    label = models.CharField(max_length=120, blank=True)
    value = models.CharField(max_length=255)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.profile}: {self.type}"


class Availability(models.Model):
    class Day(models.TextChoices):
        MONDAY = "monday", "Monday"
        TUESDAY = "tuesday", "Tuesday"
        WEDNESDAY = "wednesday", "Wednesday"
        THURSDAY = "thursday", "Thursday"
        FRIDAY = "friday", "Friday"
        SATURDAY = "saturday", "Saturday"
        SUNDAY = "sunday", "Sunday"
        FLEXIBLE = "flexible", "Flexible"

    class TimeBlock(models.TextChoices):
        MORNING = "morning", "Morning"
        AFTERNOON = "afternoon", "Afternoon"
        EVENING = "evening", "Evening"
        NIGHT = "night", "Night"
        FLEXIBLE = "flexible", "Flexible"

    profile = models.ForeignKey(StudentProfile, related_name="availability", on_delete=models.CASCADE)
    day_of_week = models.CharField(max_length=20, choices=Day.choices)
    time_block = models.CharField(max_length=20, choices=TimeBlock.choices)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "availability"

    def __str__(self):
        return f"{self.profile}: {self.day_of_week} {self.time_block}"


class Credential(models.Model):
    class CredentialType(models.TextChoices):
        RESUME = "resume", "Resume"
        TRANSCRIPT = "transcript", "Transcript"
        LINKEDIN = "linkedin", "LinkedIn"
        GITHUB = "github", "GitHub"
        PORTFOLIO = "portfolio", "Portfolio"
        WEBSITE = "website", "Website"
        CERTIFICATION = "certification", "Certification"
        PROJECT = "project", "Project"
        OTHER = "other", "Other"

    class Visibility(models.TextChoices):
        PUBLIC = "public", "Public"
        PRIVATE = "private", "Private"
        HIDDEN = "hidden", "Hidden"

    profile = models.ForeignKey(StudentProfile, related_name="credentials", on_delete=models.CASCADE)
    credential_type = models.CharField(max_length=20, choices=CredentialType.choices)
    title = models.CharField(max_length=180)
    url = models.URLField(blank=True)
    file = models.FileField(upload_to="credentials/", blank=True, null=True)
    visibility = models.CharField(max_length=20, choices=Visibility.choices, default=Visibility.PUBLIC)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.profile}: {self.title}"


class ProfileSkill(models.Model):
    class Confidence(models.TextChoices):
        BEGINNER = "beginner", "Beginner"
        INTERMEDIATE = "intermediate", "Intermediate"
        ADVANCED = "advanced", "Advanced"
        EXPERT = "expert", "Expert"

    profile = models.ForeignKey(StudentProfile, related_name="profile_skills", on_delete=models.CASCADE)
    skill = models.ForeignKey("taxonomy.SkillTag", related_name="profile_skills", on_delete=models.CASCADE)
    confidence_level = models.CharField(max_length=20, choices=Confidence.choices)
    description = models.TextField(blank=True)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["profile", "skill"], name="unique_skill_per_profile")]

    def __str__(self):
        return f"{self.profile}: {self.skill}"
