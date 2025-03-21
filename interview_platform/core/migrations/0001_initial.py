# Generated by Django 5.1.7 on 2025-03-15 07:30

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='InterviewSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(default='Interview Session', max_length=200)),
                ('description', models.TextField(blank=True, null=True)),
                ('start_time', models.DateTimeField(help_text='When the session becomes active')),
                ('end_time', models.DateTimeField(help_text='When the session expires')),
                ('date_created', models.DateTimeField(default=django.utils.timezone.now)),
                ('is_active', models.BooleanField(default=False)),
                ('access_code', models.CharField(max_length=10, unique=True)),
                ('max_participants', models.PositiveIntegerField(default=10)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='created_sessions', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-start_time'],
            },
        ),
        migrations.CreateModel(
            name='SessionCode',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('code', models.CharField(max_length=10, unique=True)),
                ('is_valid', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('session', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='session_code', to='core.interviewsession')),
            ],
        ),
        migrations.CreateModel(
            name='SessionParticipant',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('join_time', models.DateTimeField(default=django.utils.timezone.now)),
                ('is_present', models.BooleanField(default=True)),
                ('session', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='participants', to='core.interviewsession')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='session_participations', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('session', 'user')},
            },
        ),
    ]
