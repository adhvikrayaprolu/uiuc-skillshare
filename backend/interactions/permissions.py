from rest_framework import permissions


class IsReviewOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.reviewer_id == request.user.id


class IsHelpRequestParticipant(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return obj.seeker_id == request.user.id or obj.helper_profile.user_id == request.user.id
