"""Central audit trail writes for NRMS (avoid importing views from here)."""

from django.contrib.auth.models import AnonymousUser

from .models import AuditLog


def record_audit(*, user, action: str, model_name: str, object_id=None, description: str = '') -> None:
    """
    Persist one AuditLog row. Safe to call from serializers/views; failures must not break primary flows.
    """
    try:
        uid = None
        if user is not None and not isinstance(user, AnonymousUser):
            if getattr(user, 'is_authenticated', False):
                uid = user.pk

        AuditLog.objects.create(
            user_id=uid,
            action=action[:20],
            model_name=(model_name or 'Unknown')[:100],
            object_id=object_id,
            description=(description or '')[:4000],
        )
    except Exception:
        # Never block auth / CRUD if audit storage fails
        pass
