from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0004_user_requires_password_change'),
    ]

    operations = [
        migrations.AlterField(
            model_name='auditlog',
            name='action',
            field=models.CharField(
                choices=[
                    ('CREATE', 'Create'),
                    ('UPDATE', 'Update'),
                    ('DELETE', 'Delete'),
                    ('LOGIN', 'Login'),
                    ('LOGOUT', 'Logout'),
                    ('PASSWORD_CHANGE', 'Password change'),
                    ('REPORT', 'Report generated'),
                ],
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='auditlog',
            name='object_id',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
