from django.utils import timezone
from django.db.models import Prefetch
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .audit_service import record_audit
from .models import AuditLog, Book, Entry, User
from .permissions import IsAdminOnly
from .serializers import (
    AuditLogSerializer,
    BookSerializer,
    EntryLiteSerializer,
    EntrySerializer,
    UserCreateUpdateSerializer,
    UserSerializer,
)


def _resolve_user(request):
    """Return the authenticated User or None (safe for FK fields)."""
    user = getattr(request, 'user', None)
    if user and getattr(user, 'is_authenticated', False):
        return user
    return None


# USER VIEWSET


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]
    queryset = User.objects.all().order_by('date_joined')

    def get_serializer_class(self):
        if self.action in ('create',):
            return UserCreateUpdateSerializer
        if self.action in ('update', 'partial_update'):
            return UserCreateUpdateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        record_audit(
            user=self.request.user,
            action='CREATE',
            model_name='User',
            object_id=user.pk,
            description=f'Created user @{user.username} ({user.role}); requires_password_change={user.requires_password_change}',
        )

    def perform_update(self, serializer):
        super().perform_update(serializer)
        u = serializer.instance
        record_audit(
            user=self.request.user,
            action='UPDATE',
            model_name='User',
            object_id=u.pk,
            description=f'Updated user @{u.username}',
        )

    def perform_destroy(self, instance):
        pk = instance.pk
        uname = instance.username
        super().perform_destroy(instance)
        record_audit(
            user=self.request.user,
            action='DELETE',
            model_name='User',
            object_id=pk,
            description=f'Deleted user @{uname}',
        )

    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        state = 'activated' if user.is_active else 'deactivated'
        record_audit(
            user=request.user,
            action='UPDATE',
            model_name='User',
            object_id=user.pk,
            description=f'{state.capitalize()} user @{user.username}',
        )
        return Response({'message': f'User {state}.', 'is_active': user.is_active})


# ENTRY VIEWSET


class EntryViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Entry.objects.select_related('book', 'page', 'user').prefetch_related(
        Prefetch('parties'),
        Prefetch('parties__identities'),
        Prefetch('witnesses'),
    )
    serializer_class = EntrySerializer

    def get_serializer_class(self):
        if self.action == 'list' and self.request.query_params.get('lite') == 'true':
            return EntryLiteSerializer
        return EntrySerializer

    def perform_create(self, serializer):
        instance = serializer.save(user=self.request.user)
        record_audit(
            user=self.request.user,
            action='CREATE',
            model_name='Entry',
            object_id=instance.pk,
            description=f'Created entry #{instance.entry_number} (book id {instance.book_id})',
        )

    def perform_update(self, serializer):
        super().perform_update(serializer)
        inst = serializer.instance
        record_audit(
            user=self.request.user,
            action='UPDATE',
            model_name='Entry',
            object_id=inst.pk,
            description=f'Updated entry #{inst.entry_number} (book id {inst.book_id})',
        )

    def perform_destroy(self, instance):
        pk = instance.pk
        summary = f'Entry #{instance.entry_number} (book id {instance.book_id})'
        super().perform_destroy(instance)
        record_audit(
            user=self.request.user,
            action='DELETE',
            model_name='Entry',
            object_id=pk,
            description=f'Deleted {summary}',
        )

    def get_queryset(self):
        is_lite = self.request.query_params.get('lite') == 'true'
        book_id = self.request.query_params.get('book')
        base_qs = Entry.objects.select_related('book', 'page', 'user').prefetch_related(
            Prefetch('parties'),
            Prefetch('parties__identities'),
            Prefetch('witnesses'),
        )
        if is_lite:
            base_qs = Entry.objects.only('id', 'book_id', 'date_time', 'notarial_type', 'fees', 'remarks', 'is_archived')
        if book_id:
            base_qs = base_qs.filter(book_id=book_id)
        archived = self.request.query_params.get('archived')
        if archived == 'true':
            return base_qs.filter(is_archived=True).order_by('-date_time')
        return base_qs.filter(is_archived=False).order_by('-date_time')

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        entry = self.get_object()

        entry.is_archived = True
        entry.archived_at = timezone.now()
        entry.archived_by = _resolve_user(request)
        entry.save()

        record_audit(
            user=request.user,
            action='UPDATE',
            model_name='Entry',
            object_id=entry.pk,
            description=f'Archived entry #{entry.entry_number}',
        )

        return Response({'message': 'Entry archived'})

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        try:
            entry = Entry.objects.get(pk=pk)
        except Entry.DoesNotExist:
            return Response({'error': 'Entry not found.'}, status=404)

        conflict = Entry.objects.filter(
            book_id=entry.book_id,
            entry_number=entry.entry_number,
            is_archived=False,
        ).exclude(pk=entry.pk).exists()
        if conflict:
            return Response(
                {
                    'detail': (
                        f'Cannot restore entry #{entry.entry_number} because an active entry already '
                        'uses that number in this book. Archive the current active one first.'
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        entry.is_archived = False
        entry.archived_at = None
        entry.archived_by = None
        entry.save()

        record_audit(
            user=request.user,
            action='UPDATE',
            model_name='Entry',
            object_id=entry.pk,
            description=f'Restored entry #{entry.entry_number}',
        )

        return Response({'message': 'Entry restored'})


# BOOK VIEWSET


class BookViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = Book.objects.all()
    serializer_class = BookSerializer

    def perform_create(self, serializer):
        instance = serializer.save()
        record_audit(
            user=self.request.user,
            action='CREATE',
            model_name='Book',
            object_id=instance.pk,
            description=f'Created book {instance.book_number}',
        )

    def perform_update(self, serializer):
        super().perform_update(serializer)
        b = serializer.instance
        record_audit(
            user=self.request.user,
            action='UPDATE',
            model_name='Book',
            object_id=b.pk,
            description=f'Updated book {b.book_number}',
        )

    def perform_destroy(self, instance):
        pk = instance.pk
        bn = instance.book_number
        super().perform_destroy(instance)
        record_audit(
            user=self.request.user,
            action='DELETE',
            model_name='Book',
            object_id=pk,
            description=f'Deleted book {bn}',
        )

    def get_queryset(self):
        archived = self.request.query_params.get('archived')
        if archived == 'true':
            return Book.objects.filter(is_archived=True)
        return Book.objects.filter(is_archived=False)

    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        book = self.get_object()
        user = _resolve_user(request)

        n = book.entries.filter(is_archived=False).count()

        book.is_archived = True
        book.archived_at = timezone.now()
        book.archived_by = user
        book.save()

        book.entries.update(
            is_archived=True,
            archived_at=timezone.now(),
            archived_by=user,
        )

        record_audit(
            user=request.user,
            action='UPDATE',
            model_name='Book',
            object_id=book.pk,
            description=f'Archived book {book.book_number}; cascaded {n} active entries',
        )

        return Response({'message': 'Book and entries archived'})

    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        try:
            book = Book.objects.get(pk=pk)
        except Book.DoesNotExist:
            return Response({'error': 'Book not found.'}, status=404)

        conflict = Book.objects.filter(
            book_number=book.book_number,
            is_archived=False,
        ).exclude(pk=book.pk).exists()
        if conflict:
            return Response(
                {
                    'detail': (
                        f'Cannot restore book {book.book_number} because another active book already '
                        'uses that book number. Archive the active one first.'
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        n = book.entries.filter(is_archived=True).count()

        book.is_archived = False
        book.archived_at = None
        book.archived_by = None
        book.save()

        book.entries.update(
            is_archived=False,
            archived_at=None,
            archived_by=None,
        )

        record_audit(
            user=request.user,
            action='UPDATE',
            model_name='Book',
            object_id=book.pk,
            description=f'Restored book {book.book_number}; restored {n} archived entries',
        )

        return Response({'message': 'Book and entries restored'})


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdminOnly]
    pagination_class = None
    queryset = AuditLog.objects.select_related('user').all().order_by('-timestamp')
    serializer_class = AuditLogSerializer
