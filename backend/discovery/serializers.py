from rest_framework import serializers


class DiscoverySearchResultSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    display_name = serializers.CharField()
    major = serializers.CharField()
    year = serializers.CharField()
    headline = serializers.CharField()
    top_skills = serializers.ListField(child=serializers.CharField())
    match_score = serializers.IntegerField()
    open_to_connect = serializers.BooleanField()
    preferred_contact_method = serializers.CharField()


class DashboardSerializer(serializers.Serializer):
    user = serializers.DictField()
    profile = serializers.DictField(allow_null=True)
    profile_completeness = serializers.IntegerField()
    skill_count = serializers.IntegerField()
    saved_profile_count = serializers.IntegerField()
    incoming_help_request_count = serializers.IntegerField()
    review_count = serializers.IntegerField()
    next_actions = serializers.ListField(child=serializers.CharField())
