from django.db import models
from django.contrib.auth.models import AbstractUser


# USER (Attorney / Admin)

class User(AbstractUser):
    ROLE_CHOICES = (
        ('ADMIN', 'Admin'),
        ('ATTORNEY', 'Attorney'),
        ('SECRETARY', 'Secretary')
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    requires_password_change = models.BooleanField(
        default=False,
        help_text='When True, client must redirect to mandatory password reset after login.',
    )

    class Meta:
        db_table = 'tbl_user'
        verbose_name = 'user'
        verbose_name_plural = 'users'



# BOOK

class Book(models.Model):
    book_number = models.CharField(max_length=50)
    total_pages = models.IntegerField(default=105)
    appointment_date = models.DateField(null=True, blank=True)
    expiration_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # ARCHIVE
    is_archived = models.BooleanField(default=False)
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='archived_books'
    )
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='deleted_books'
    )

    def __str__(self):
        return f"Book {self.book_number}"

    class Meta:
        db_table = 'tbl_book'
        constraints = [
            models.UniqueConstraint(
                fields=['book_number'],
                condition=models.Q(is_archived=False),
                name='uniq_active_book_number',
            )
        ]



# PAGE

class Page(models.Model):
    book = models.ForeignKey(Book, related_name='pages', on_delete=models.CASCADE)
    page_number = models.IntegerField()

    class Meta:
        db_table = 'tbl_page'
        unique_together = ('book', 'page_number')

    def __str__(self):
        return f"Book {self.book.book_number} - Page {self.page_number}"



# ENTRY (MAIN RECORD)

class Entry(models.Model):

    # NOTARIAL TYPE
    ACKNOWLEDGEMENT = 'ACK'
    SUBSCRIPTION = 'SUB'
    CERTIFICATION = 'CERT'

    NOTARIAL_TYPES = [
        (ACKNOWLEDGEMENT, 'Acknowledgement'),
        (SUBSCRIPTION, 'Subscription'),
        (CERTIFICATION, 'Certification'),
    ]

    # REMARKS
    COPY_RETAINED = 'CR'
    NO_COPY_RETAINED = 'NCR'

    REMARK_CHOICES = [
        (COPY_RETAINED, 'Copy Retained'),
        (NO_COPY_RETAINED, 'No Copy Retained'),
    ]

    book = models.ForeignKey(Book, related_name='entries', on_delete=models.CASCADE)
    page = models.ForeignKey(Page, related_name='entries', on_delete=models.CASCADE)
    user = models.ForeignKey(User, related_name='entries', on_delete=models.CASCADE)

    entry_number = models.IntegerField()
    title = models.CharField(max_length=255, null=True, blank=True)
    date_time = models.DateTimeField()

    notarial_type = models.CharField(max_length=5, choices=NOTARIAL_TYPES)
    fees = models.DecimalField(max_digits=10, decimal_places=2)
    or_number = models.CharField(max_length=50)

    remarks = models.CharField(max_length=3, choices=REMARK_CHOICES)

    # ARCHIVE
    is_archived = models.BooleanField(default=False)
    archived_at = models.DateTimeField(null=True, blank=True)
    archived_by = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='archived_entries'
    )
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    deleted_by = models.ForeignKey(
        User, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='deleted_entries'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_entry'
        constraints = [
            models.UniqueConstraint(
                fields=['book', 'entry_number'],
                condition=models.Q(is_archived=False),
                name='uniq_active_entry_number_per_book',
            )
        ]

    def __str__(self):
        return f"Entry {self.entry_number} - Book {self.book.book_number}"


# WORKFLOW INTAKE / DRAFTS

class ClientIntake(models.Model):
    PENDING = 'PENDING'
    PROCESSING = 'PROCESSING'
    COMPLETED = 'COMPLETED'
    CANCELLED = 'CANCELLED'

    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (PROCESSING, 'Processing'),
        (COMPLETED, 'Completed'),
        (CANCELLED, 'Cancelled'),
    ]

    queue_number = models.CharField(max_length=30, unique=True)
    client_name = models.CharField(max_length=255)
    address = models.TextField()
    scheduled_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=PENDING)

    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='created_intakes')
    cancelled_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='cancelled_intakes')
    cancel_reason = models.TextField(blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tbl_client_intake'
        ordering = ['created_at', 'id']

    def __str__(self):
        return f"{self.queue_number} - {self.client_name}"


class ClientIntakeParty(models.Model):
    intake = models.ForeignKey(ClientIntake, related_name='parties', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    address = models.TextField()
    id_type = models.CharField(max_length=100, default='')
    id_number = models.CharField(max_length=100, default='')

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'tbl_client_intake_party'


class WorkflowDraft(models.Model):
    DRAFT = 'DRAFT'
    READY = 'READY'
    FINALIZED = 'FINALIZED'
    CANCELLED = 'CANCELLED'

    STATUS_CHOICES = [
        (DRAFT, 'Draft'),
        (READY, 'Ready for Finalization'),
        (FINALIZED, 'Finalized'),
        (CANCELLED, 'Cancelled'),
    ]

    intake = models.OneToOneField(ClientIntake, related_name='draft', on_delete=models.CASCADE)
    document_title = models.CharField(max_length=255, blank=True)
    notarial_type = models.CharField(max_length=5, choices=Entry.NOTARIAL_TYPES, blank=True)
    notarization_datetime = models.DateTimeField(null=True, blank=True)
    fees = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    or_number = models.CharField(max_length=50, blank=True)
    remarks = models.CharField(max_length=3, choices=Entry.REMARK_CHOICES, blank=True)
    witnesses = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=DRAFT)
    finalized_entry = models.OneToOneField(Entry, null=True, blank=True, on_delete=models.SET_NULL, related_name='workflow_draft')

    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='created_workflow_drafts')
    updated_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='updated_workflow_drafts')
    finalized_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='finalized_workflow_drafts')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    finalized_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'tbl_workflow_draft'
        ordering = ['intake__created_at', 'id']

    def __str__(self):
        return f"Draft for {self.intake.queue_number}"

# PARTY

class Party(models.Model):
    entry = models.ForeignKey(Entry, related_name='parties', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    address = models.TextField()

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'tbl_party'



# WITNESS

class Witness(models.Model):
    entry = models.ForeignKey(Entry, related_name='witnesses', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    address = models.TextField()

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'tbl_witness'



# IDENTITY (Per Party)

class Identity(models.Model):
    party = models.ForeignKey(Party, related_name='identities', on_delete=models.CASCADE)
    id_type = models.CharField(max_length=100)
    id_number = models.CharField(max_length=100)
    issue_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.id_type} - {self.id_number}"

    class Meta:
        db_table = 'tbl_identity'


# AUDIT LOGS

class AuditLog(models.Model):
    ACTIONS = (
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('PASSWORD_CHANGE', 'Password change'),
        ('REPORT', 'Report generated'),
    )

    user = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)

    action = models.CharField(max_length=20, choices=ACTIONS)
    model_name = models.CharField(max_length=100)
    object_id = models.IntegerField(null=True, blank=True)

    timestamp = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.action} - {self.model_name} ({self.object_id})"

    class Meta:
        db_table = 'tbl_audit_log'
