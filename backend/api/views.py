from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone

from .models import *
from .serializers import *



# ENTRY VIEWSET

class EntryViewSet(viewsets.ModelViewSet):
    queryset = Entry.objects.all()
    serializer_class = EntrySerializer

    # FILTER ACTIVE / ARCHIVED
    def get_queryset(self):
        archived = self.request.query_params.get('archived')
        if archived == 'true':
            return Entry.objects.filter(is_archived=True)
        return Entry.objects.filter(is_archived=False)

    # AUTO USER ASSIGN
    def perform_create(self, serializer):
        serializer.save()

    # ARCHIVE ENTRY
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        entry = self.get_object()

        entry.is_archived = True
        entry.archived_at = timezone.now()
        entry.archived_by = request.user
        entry.save()

        return Response({"message": "Entry archived"})

    # RESTORE ENTRY
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        entry = self.get_object()

        entry.is_archived = False
        entry.archived_at = None
        entry.archived_by = None
        entry.save()

        return Response({"message": "Entry restored"})
    

# BOOK VIEWSET

class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all()
    serializer_class = BookSerializer

    def get_queryset(self):
        archived = self.request.query_params.get('archived')
        if archived == 'true':
            return Book.objects.filter(is_archived=True)
        return Book.objects.filter(is_archived=False)

    # ARCHIVE BOOK (CASCADE)
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        book = self.get_object()

        book.is_archived = True
        book.archived_at = timezone.now()
        book.archived_by = request.user
        book.save()

        # CASCADE ENTRIES
        book.entries.update(
            is_archived=True,
            archived_at=timezone.now(),
            archived_by=request.user
        )

        return Response({"message": "Book and entries archived"})

    # RESTORE BOOK
    @action(detail=True, methods=['post'])
    def restore(self, request, pk=None):
        book = self.get_object()

        book.is_archived = False
        book.archived_at = None
        book.archived_by = None
        book.save()

        # RESTORE ENTRIES
        book.entries.update(
            is_archived=False,
            archived_at=None,
            archived_by=None
        )

        return Response({"message": "Book and entries restored"})