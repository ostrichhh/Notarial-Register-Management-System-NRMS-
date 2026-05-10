from rest_framework.permissions import BasePermission


class IsAdminOnly(BasePermission):
    """Admin role only."""

    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            return False
        return user.role == 'ADMIN'
