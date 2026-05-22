from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .auth_views import (
    LoginView,
    auth_change_password,
    auth_complete_first_login,
    auth_logout,
    auth_me,
)
from .reports_views import generate_office_report
from .views import AuditLogViewSet, BookViewSet, ClientIntakeViewSet, EntryViewSet, UserViewSet, WorkflowDraftViewSet

router = DefaultRouter()
router.register(r'entries', EntryViewSet)
router.register(r'books', BookViewSet)
router.register(r'users', UserViewSet)
router.register(r'audit-logs', AuditLogViewSet, basename='auditlog')
router.register(r'client-intakes', ClientIntakeViewSet, basename='clientintake')
router.register(r'workflow-drafts', WorkflowDraftViewSet, basename='workflowdraft')

urlpatterns = [
    path('auth/login/', LoginView.as_view()),
    path('auth/refresh/', TokenRefreshView.as_view()),
    path('auth/me/', auth_me),
    path('auth/logout/', auth_logout),
    path('auth/complete-first-login/', auth_complete_first_login),
    path('auth/change-password/', auth_change_password),
    path('reports/generate/', generate_office_report),
    *router.urls,
]
