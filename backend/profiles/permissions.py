from rest_framework import permissions


class IsProfileOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        profile = getattr(obj, "profile", obj)
        return getattr(profile, "user_id", None) == request.user.id
