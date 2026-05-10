from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('api', '0003_book_appointment_date_book_expiration_date'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='requires_password_change',
            field=models.BooleanField(
                default=False,
                help_text='When True, client must redirect to mandatory password reset after login.',
            ),
        ),
    ]
