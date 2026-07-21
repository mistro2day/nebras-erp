from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('admissions', '0004_alter_admissionsettings_options_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='guardian',
            name='phone2',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='guardian',
            name='whatsapp_phone',
            field=models.CharField(blank=True, max_length=30, null=True),
        ),
    ]
