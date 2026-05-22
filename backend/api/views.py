from django.utils import timezone
from django.db import transaction
from django.db.models import Prefetch
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .audit_service import record_audit
from .models import AuditLog, Book, ClientIntake, Entry, Page, User, WorkflowDraft
from .permissions import IsAdminOnly, IsAdminOrAttorney
from .serializers import (
    AuditLogSerializer,
    BookSerializer,
    ClientIntakeSerializer,
    EntryLiteSerializer,
    EntrySerializer,
    WorkflowDraftSerializer,
    UserCreateUpdateSerializer,
    UserSerializer,
)


def _resolve_user(request):
    """Return the authenticated User or None (safe for FK fields)."""
    user = getattr(request, 'user', None)
    if user and getattr(user, 'is_authenticated', False):
        return user
    return None


def _next_queue_number():
    year = timezone.now().year
    prefix = f'Q-{year}-'
    latest = (
        ClientIntake.objects.filter(queue_number__startswith=prefix)
        .order_by('-queue_number')
        .first()
    )
    if not latest:
        return f'{prefix}001'
    try:
        next_number = int(latest.queue_number.rsplit('-', 1)[1]) + 1
    except (IndexError, ValueError):
        next_number = ClientIntake.objects.filter(queue_number__startswith=prefix).count() + 1
    return f'{prefix}{next_number:03d}'


def _first_available_assignment():
    for book in Book.objects.filter(is_archived=False).order_by('book_number', 'id'):
        used = set(
            Entry.objects.filter(book=book)
            .values_list('entry_number', flat=True)
        )
        max_entries = int(book.total_pages or 105) * 5
        for entry_number in range(1, max_entries + 1):
            if entry_number not in used:
                page_number = ((entry_number - 1) // 5) + 1
                page, _ = Page.objects.get_or_create(book=book, page_number=page_number)
                return book, page, entry_number
    return None, None, None


def _draft_missing_fields(draft):
    missing = []
    checks = {
        'document_title': draft.document_title,
        'notarial_type': draft.notarial_type,
        'notarization_datetime': draft.notarization_datetime,
        'fees': draft.fees,
        'or_number': draft.or_number,
        'remarks': draft.remarks,
        'witnesses': draft.witnesses,
    }
    for field, value in checks.items():
        if value in (None, '', []):
            missing.append(field)
    return missing


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
        if instance.is_archived or self.request.query_params.get('archived') == 'true':
            instance.is_archived = True
            instance.is_deleted = True
            instance.deleted_at = timezone.now()
            instance.deleted_by = _resolve_user(self.request)
            if instance.archived_at is None:
                instance.archived_at = instance.deleted_at
            instance.save(update_fields=['is_archived', 'is_deleted', 'deleted_at', 'deleted_by', 'archived_at'])
            description = f'Marked archived {summary} as deleted; slot preserved'
        else:
            super().perform_destroy(instance)
            description = f'Deleted {summary}'
        record_audit(
            user=self.request.user,
            action='DELETE',
            model_name='Entry',
            object_id=pk,
            description=description,
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
            base_qs = Entry.objects.only('id', 'book_id', 'date_time', 'notarial_type', 'fees', 'remarks', 'is_archived', 'is_deleted')
        if book_id:
            base_qs = base_qs.filter(book_id=book_id)
        archived = self.request.query_params.get('archived')
        if archived == 'true':
            return base_qs.filter(is_archived=True).order_by('-date_time')
        return base_qs.filter(is_archived=False, is_deleted=False).order_by('-date_time')

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
            is_deleted=False,
        ).exclude(pk=entry.pk).exists()
        if entry.is_deleted:
            return Response(
                {'detail': 'This archived entry was marked deleted and is kept only to preserve its slot.'},
                status=status.HTTP_409_CONFLICT,
            )
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

    @action(detail=True, methods=['post'], url_path='replace-deleted')
    def replace_deleted(self, request, pk=None):
        try:
            entry = Entry.objects.select_related('book', 'page').get(pk=pk)
        except Entry.DoesNotExist:
            return Response({'detail': 'Entry not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not entry.is_archived or not entry.is_deleted:
            return Response(
                {'detail': 'Only deleted archived slots can be filled from this action.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        requested_book = request.data.get('book')
        requested_entry_number = request.data.get('entry_number')
        if str(requested_book) != str(entry.book_id) or str(requested_entry_number) != str(entry.entry_number):
            return Response(
                {'detail': 'This entry must use the same book and entry number as the deleted slot.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(entry, data=request.data)
        serializer.is_valid(raise_exception=True)
        entry = serializer.save()
        entry.is_archived = False
        entry.archived_at = None
        entry.archived_by = None
        entry.is_deleted = False
        entry.deleted_at = None
        entry.deleted_by = None
        entry.save(update_fields=['is_archived', 'archived_at', 'archived_by', 'is_deleted', 'deleted_at', 'deleted_by', 'updated_at'])

        record_audit(
            user=request.user,
            action='CREATE',
            model_name='Entry',
            object_id=entry.pk,
            description=f'Filled deleted slot as entry #{entry.entry_number} (book id {entry.book_id})',
        )

        return Response(self.get_serializer(entry).data, status=status.HTTP_200_OK)


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
        if instance.is_archived or self.request.query_params.get('archived') == 'true':
            deleted_at = timezone.now()
            user = _resolve_user(self.request)
            instance.is_archived = True
            instance.is_deleted = True
            instance.deleted_at = deleted_at
            instance.deleted_by = user
            if instance.archived_at is None:
                instance.archived_at = deleted_at
            instance.save(update_fields=['is_archived', 'is_deleted', 'deleted_at', 'deleted_by', 'archived_at'])
            instance.entries.update(
                is_archived=True,
                is_deleted=True,
                deleted_at=deleted_at,
                deleted_by=user,
            )
            description = f'Marked archived book {bn} as deleted; book number and entry slots preserved'
        else:
            super().perform_destroy(instance)
            description = f'Deleted book {bn}'
        record_audit(
            user=self.request.user,
            action='DELETE',
            model_name='Book',
            object_id=pk,
            description=description,
        )

    def get_queryset(self):
        archived = self.request.query_params.get('archived')
        if archived == 'true':
            return Book.objects.filter(is_archived=True)
        return Book.objects.filter(is_archived=False, is_deleted=False)

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
            is_deleted=False,
        ).exclude(pk=book.pk).exists()
        if book.is_deleted:
            return Response(
                {'detail': 'This archived book was marked deleted and is kept only to preserve its book number.'},
                status=status.HTTP_409_CONFLICT,
            )
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


class ClientIntakeViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = ClientIntake.objects.select_related('created_by', 'cancelled_by').prefetch_related('parties').all()
    serializer_class = ClientIntakeSerializer

    def perform_create(self, serializer):
        intake = serializer.save(
            queue_number=_next_queue_number(),
            created_by=_resolve_user(self.request),
        )
        WorkflowDraft.objects.create(
            intake=intake,
            created_by=_resolve_user(self.request),
        )
        record_audit(
            user=self.request.user,
            action='CREATE',
            model_name='ClientIntake',
            object_id=intake.pk,
            description=f'Created client intake {intake.queue_number}',
        )

    def perform_update(self, serializer):
        intake = serializer.save()
        record_audit(
            user=self.request.user,
            action='UPDATE',
            model_name='ClientIntake',
            object_id=intake.pk,
            description=f'Updated client details for {intake.queue_number}',
        )

    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        intake = self.get_object()
        if intake.status == ClientIntake.CANCELLED:
            return Response({'detail': 'Cancelled clients cannot be processed.'}, status=status.HTTP_400_BAD_REQUEST)
        intake.status = ClientIntake.PROCESSING
        intake.save(update_fields=['status', 'updated_at'])
        record_audit(
            user=request.user,
            action='UPDATE',
            model_name='ClientIntake',
            object_id=intake.pk,
            description=f'Moved {intake.queue_number} to processing',
        )
        return Response(self.get_serializer(intake).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        intake = self.get_object()
        reason = request.data.get('reason', '')
        intake.status = ClientIntake.CANCELLED
        intake.cancel_reason = reason
        intake.cancelled_at = timezone.now()
        intake.cancelled_by = _resolve_user(request)
        intake.save()
        WorkflowDraft.objects.filter(intake=intake).update(status=WorkflowDraft.CANCELLED)
        record_audit(
            user=request.user,
            action='UPDATE',
            model_name='ClientIntake',
            object_id=intake.pk,
            description=f'Cancelled {intake.queue_number}; reason={reason or "Not specified"}',
        )
        return Response(self.get_serializer(intake).data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        intake = self.get_object()
        if intake.status == ClientIntake.CANCELLED:
            return Response({'detail': 'Cancelled clients cannot be completed.'}, status=status.HTTP_400_BAD_REQUEST)
        intake.status = ClientIntake.COMPLETED
        intake.save(update_fields=['status', 'updated_at'])
        record_audit(
            user=request.user,
            action='UPDATE',
            model_name='ClientIntake',
            object_id=intake.pk,
            description=f'Marked {intake.queue_number} complete in queue',
        )
        return Response(self.get_serializer(intake).data)


class WorkflowDraftViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    queryset = WorkflowDraft.objects.select_related(
        'intake',
        'finalized_entry',
        'finalized_entry__book',
        'finalized_entry__page',
    ).all()
    serializer_class = WorkflowDraftSerializer

    def perform_update(self, serializer):
        if serializer.instance.intake.status != ClientIntake.COMPLETED:
            raise serializers.ValidationError('Draft entry can only be encoded after the queue item is completed.')
        draft = serializer.save(status=WorkflowDraft.READY, updated_by=_resolve_user(self.request))
        record_audit(
            user=self.request.user,
            action='UPDATE',
            model_name='WorkflowDraft',
            object_id=draft.pk,
            description=f'Saved complete draft for {draft.intake.queue_number}',
        )

    @transaction.atomic
    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        draft = (
            WorkflowDraft.objects.select_for_update()
            .select_related('intake')
            .get(pk=pk)
        )
        if draft.status == WorkflowDraft.FINALIZED:
            return Response({'detail': 'Draft is already finalized.'}, status=status.HTTP_400_BAD_REQUEST)
        if draft.status == WorkflowDraft.CANCELLED or draft.intake.status == ClientIntake.CANCELLED:
            return Response({'detail': 'Cancelled clients cannot be finalized.'}, status=status.HTTP_400_BAD_REQUEST)
        if draft.intake.status != ClientIntake.COMPLETED:
            return Response({'detail': 'Complete the queue item before finalization.'}, status=status.HTTP_400_BAD_REQUEST)

        missing = _draft_missing_fields(draft)
        if missing:
            return Response(
                {'detail': f"Complete all draft fields before finalization: {', '.join(missing)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        book, page, entry_number = _first_available_assignment()
        if not book:
            return Response({'detail': 'No available active book slot.'}, status=status.HTTP_409_CONFLICT)

        entry = Entry.objects.create(
            book=book,
            page=page,
            user=request.user,
            entry_number=entry_number,
            title=draft.document_title,
            date_time=draft.notarization_datetime,
            notarial_type=draft.notarial_type,
            fees=draft.fees,
            or_number=draft.or_number,
            remarks=draft.remarks,
        )
        for intake_party in draft.intake.parties.all():
            party = entry.parties.create(
                name=intake_party.name,
                address=intake_party.address,
            )
            party.identities.create(id_type=intake_party.id_type, id_number=intake_party.id_number)
        for witness in draft.witnesses or []:
            if isinstance(witness, dict):
                name = witness.get('name')
                address = witness.get('address') or 'On file'
            else:
                name = str(witness)
                address = 'On file'
            if name:
                entry.witnesses.create(name=name, address=address)

        draft.status = WorkflowDraft.FINALIZED
        draft.finalized_entry = entry
        draft.finalized_by = _resolve_user(request)
        draft.finalized_at = timezone.now()
        draft.save()

        draft.intake.status = ClientIntake.COMPLETED
        draft.intake.save(update_fields=['status', 'updated_at'])

        record_audit(
            user=request.user,
            action='CREATE',
            model_name='Entry',
            object_id=entry.pk,
            description=f'Finalized {draft.intake.queue_number} as entry #{entry.entry_number} in book {book.book_number}',
        )

        return Response(EntrySerializer(entry, context={'request': request}).data, status=status.HTTP_201_CREATED)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsAdminOrAttorney]
    pagination_class = None
    queryset = AuditLog.objects.select_related('user').all().order_by('-timestamp')
    serializer_class = AuditLogSerializer
