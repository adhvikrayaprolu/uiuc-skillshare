from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    owner_field = "user"

    def has_object_permission(self, request, view, obj):
        return getattr(obj, f"{self.owner_field}_id", None) == request.user.id
