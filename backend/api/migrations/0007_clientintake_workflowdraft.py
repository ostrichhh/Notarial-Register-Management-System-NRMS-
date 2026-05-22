from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0006_alter_entry_unique_together_alter_book_book_number_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='ClientIntake',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('queue_number', models.CharField(max_length=30, unique=True)),
                ('client_name', models.CharField(max_length=255)),
                ('address', models.TextField()),
                ('scheduled_date', models.DateField()),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('PROCESSING', 'Processing'), ('COMPLETED', 'Completed'), ('CANCELLED', 'Cancelled')], default='PENDING', max_length=20)),
                ('cancel_reason', models.TextField(blank=True)),
                ('cancelled_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('cancelled_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='cancelled_intakes', to=settings.AUTH_USER_MODEL)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_intakes', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['created_at', 'id'],
            },
        ),
        migrations.CreateModel(
            name='WorkflowDraft',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('document_title', models.CharField(blank=True, max_length=255)),
                ('notarial_type', models.CharField(blank=True, choices=[('ACK', 'Acknowledgement'), ('SUB', 'Subscription'), ('CERT', 'Certification')], max_length=5)),
                ('fees', models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True)),
                ('or_number', models.CharField(blank=True, max_length=50)),
                ('remarks', models.CharField(blank=True, choices=[('CR', 'Copy Retained'), ('NCR', 'No Copy Retained')], max_length=3)),
                ('witnesses', models.JSONField(blank=True, default=list)),
                ('identities', models.JSONField(blank=True, default=list)),
                ('status', models.CharField(choices=[('DRAFT', 'Draft'), ('READY', 'Ready for Finalization'), ('FINALIZED', 'Finalized'), ('CANCELLED', 'Cancelled')], default='DRAFT', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('finalized_at', models.DateTimeField(blank=True, null=True)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_workflow_drafts', to=settings.AUTH_USER_MODEL)),
                ('finalized_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='finalized_workflow_drafts', to=settings.AUTH_USER_MODEL)),
                ('finalized_entry', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='workflow_draft', to='api.entry')),
                ('intake', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='draft', to='api.clientintake')),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='updated_workflow_drafts', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['intake__created_at', 'id'],
            },
        ),
    ]
