from django.urls import path

from .views import PopularSkillListView, SkillCategoryListView, SkillSuggestView, SkillTagListView


urlpatterns = [
    path("skill-categories/", SkillCategoryListView.as_view(), name="skill-categories"),
    path("skills/", SkillTagListView.as_view(), name="skills"),
    path("skills/popular/", PopularSkillListView.as_view(), name="skills-popular"),
    path("skills/suggest/", SkillSuggestView.as_view(), name="skills-suggest"),
]
