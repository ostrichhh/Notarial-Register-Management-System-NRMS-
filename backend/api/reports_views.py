from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .audit_service import record_audit
from .models import Book, Entry, User

REPORT_TYPE_LABELS = {
    'summary': 'Office summary',
    'notarial_acts': 'Notarial acts breakdown',
    'remarks': 'Remarks',
}

NOTARIAL_TYPE_LABELS = {
    'ACK': 'Acknowledgement',
    'SUB': 'Subscription',
    'CERT': 'Certification',
}

REMARKS_LABELS = {
    'CR': 'Copy Retained',
    'NCR': 'No Copy Retained',
}


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_office_report(request):
    """Returns summary counts and records a REPORT audit row (significant office activity)."""
    report_type = request.data.get('report_type') or 'summary'
    book_id = request.data.get('book') or None
    notarial_type = request.data.get('notarial_type') or None
    remark = request.data.get('remark') or None

    if report_type not in REPORT_TYPE_LABELS:
        report_type = 'summary'
    if notarial_type not in NOTARIAL_TYPE_LABELS:
        notarial_type = None
    if remark not in REMARKS_LABELS:
        remark = None

    selected_book = None
    entries_qs = Entry.objects.select_related('book', 'page').filter(is_archived=False)
    if book_id:
        selected_book = Book.objects.filter(pk=book_id).first()
        entries_qs = entries_qs.filter(book_id=book_id)
    if report_type == 'notarial_acts' and notarial_type:
        entries_qs = entries_qs.filter(notarial_type=notarial_type)
    if report_type == 'remarks' and remark:
        entries_qs = entries_qs.filter(remarks=remark)

    books_active = Book.objects.filter(is_archived=False).count()
    books_archived = Book.objects.filter(is_archived=True).count()
    entries_active = Entry.objects.filter(is_archived=False).count()
    entries_archived = Entry.objects.filter(is_archived=True).count()
    users_active = User.objects.filter(is_active=True).count()

    payload = {
        'generated_at': timezone.now().isoformat(),
        'requested_by': request.user.username,
        'report_type': report_type,
        'report_label': REPORT_TYPE_LABELS[report_type],
        'filters': {
            'book': selected_book.book_number if selected_book else 'All books',
            'book_id': selected_book.pk if selected_book else None,
            'notarial_type': NOTARIAL_TYPE_LABELS.get(notarial_type, 'All notarial types'),
            'notarial_type_code': notarial_type,
            'remark': REMARKS_LABELS.get(remark, 'All remarks'),
            'remark_code': remark,
        },
        'counts': {
            'books_active': books_active,
            'books_archived': books_archived,
            'entries_active': entries_active,
            'entries_archived': entries_archived,
            'users_active': users_active,
        },
    }

    if report_type == 'notarial_acts':
        payload['notarial_acts'] = {
            key: {
                'label': label,
                'count': entries_qs.filter(notarial_type=key).count(),
            }
            for key, label in NOTARIAL_TYPE_LABELS.items()
        }
        payload['total_entries_in_filter'] = entries_qs.count()
    elif report_type == 'remarks':
        payload['remarks'] = {
            key: {
                'label': label,
                'count': entries_qs.filter(remarks=key).count(),
            }
            for key, label in REMARKS_LABELS.items()
        }
        payload['total_entries_in_filter'] = entries_qs.count()

    payload['entries'] = [
        {
            'entry_number': entry.entry_number,
            'title': entry.title,
            'date_time': entry.date_time.isoformat() if entry.date_time else None,
            'book_number': entry.book.book_number if entry.book_id else '',
            'page_number': entry.page.page_number if entry.page_id else '',
        }
        for entry in entries_qs.order_by('book__book_number', 'entry_number')
    ]

    record_audit(
        user=request.user,
        action='REPORT',
        model_name='OfficeSummary',
        object_id=None,
        description=(
            f'Generated {REPORT_TYPE_LABELS[report_type]} report — book={payload["filters"]["book"]}, '
            f'notarial_type={payload["filters"]["notarial_type"]}, remark={payload["filters"]["remark"]}, '
            f'books(active/archived)={books_active}/{books_archived}, '
            f'entries(active/archived)={entries_active}/{entries_archived}, active_users={users_active}'
        ),
    )

    return Response(payload)
