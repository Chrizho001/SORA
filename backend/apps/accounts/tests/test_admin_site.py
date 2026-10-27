"""
Admin site (django-unfold): access control, every registered model renders, and the dashboard KPIs.
"""

from datetime import timedelta

import pytest
from django.contrib import admin
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import User
from apps.documents.models import Document, Summary
from apps.flashcards.models import Deck, Flashcard
from apps.notifications.models import Notification, NotificationType
from apps.quizzes.models import QuizQuestion, QuizSession
from apps.tasks.models import Task

from .factories import UserFactory

pytestmark = pytest.mark.django_db


@pytest.fixture
def superuser():
    return User.objects.create_superuser(email="admin@example.com", password="Adm1n-pass!")


@pytest.fixture
def admin_client(client, superuser):
    client.force_login(superuser)
    return client


@pytest.fixture
def study_data():
    """A small, known dataset covering every app."""
    now = timezone.now()
    student = UserFactory(email="student@example.com", is_email_verified=True)
    UserFactory(email="new@example.com", is_email_verified=False)

    doc_ok = Document.objects.create(
        user=student,
        file="documents/a.pdf",
        original_name="Biology.pdf",
        size=1000,
        status=Document.Status.DONE,
    )
    Summary.objects.create(document=doc_ok, content="Cells.", ai_model_used="gemini")
    Document.objects.create(
        user=student,
        file="documents/b.pdf",
        original_name="Broken.pdf",
        size=10,
        status=Document.Status.FAILED,
        error_message="Could not read the PDF.",
    )

    deck = Deck.objects.create(user=student, title="Biology", document=doc_ok)
    cards = [
        Flashcard.objects.create(
            user=student,
            deck=deck,
            question=f"Q{i}",
            answer=f"A{i}",
            source=Flashcard.Source.AI if i == 0 else Flashcard.Source.MANUAL,
        )
        for i in range(4)
    ]

    session = QuizSession.objects.create(
        user=student, deck=deck, deck_title="Biology", score=3, total_questions=4, finished_at=now
    )
    for i, card in enumerate(cards):
        QuizQuestion.objects.create(
            session=session,
            flashcard=card,
            question_text=card.question,
            correct_answer=card.answer,
            choices=["A0", "A1", "A2", "A3"],
            selected_choice=card.answer if i else "wrong",
            is_correct=bool(i),
            position=i,
        )

    Task.objects.create(user=student, title="Overdue essay", due_at=now - timedelta(days=1))
    Task.objects.create(user=student, title="Revise", due_at=now + timedelta(days=2))
    Task.objects.create(
        user=student, title="Done", is_completed=True, completed_at=now, due_at=now
    )
    Notification.objects.create(
        recipient=student, type=NotificationType.QUIZ_GRADED, title="Quiz graded", body="3/4"
    )
    return {"student": student, "deck": deck, "session": session, "doc": doc_ok}


class TestAdminAccess:
    def test_anonymous_is_redirected_to_login(self, client):
        response = client.get(reverse("admin:index"))
        assert response.status_code == 302
        assert reverse("admin:login") in response["Location"]

    def test_non_staff_student_cannot_enter(self, client):
        client.force_login(UserFactory(email="s@example.com"))
        response = client.get(reverse("admin:index"))
        assert response.status_code == 302

    def test_login_without_next_lands_on_dashboard(self, client, superuser):
        response = client.post(
            reverse("admin:login"), {"username": "admin@example.com", "password": "Adm1n-pass!"}
        )
        assert response.status_code == 302
        assert response["Location"] == reverse("admin:index")

    def test_login_page_is_branded(self, client):
        response = client.get(reverse("admin:login"))
        assert response.status_code == 200
        assert b"SORA" in response.content


class TestEveryModelRenders:
    def test_changelist_and_add_pages_render_for_every_registered_model(
        self, admin_client, study_data
    ):
        for model, model_admin in admin.site._registry.items():
            opts = model._meta
            changelist = reverse(f"admin:{opts.app_label}_{opts.model_name}_changelist")
            assert admin_client.get(changelist).status_code == 200, changelist
            if model_admin.has_add_permission(_request(admin_client)):
                add = reverse(f"admin:{opts.app_label}_{opts.model_name}_add")
                assert admin_client.get(add).status_code == 200, add

    def test_change_pages_render_with_inlines(self, admin_client, study_data):
        for obj in (
            study_data["student"],
            study_data["deck"],
            study_data["session"],
            study_data["doc"],
        ):
            opts = obj._meta
            url = reverse(f"admin:{opts.app_label}_{opts.model_name}_change", args=[obj.pk])
            assert admin_client.get(url).status_code == 200, url

    def test_unfold_model_admin_is_used_everywhere(self):
        from unfold.admin import ModelAdmin

        for model, model_admin in admin.site._registry.items():
            assert isinstance(model_admin, ModelAdmin), model


class TestDashboard:
    def test_dashboard_shows_kpis(self, admin_client, study_data):
        response = admin_client.get(reverse("admin:index"))
        assert response.status_code == 200
        kpis = {k["key"]: k for k in response.context["kpis"]}
        assert kpis["students"]["value"] == 2  # superuser is staff, not a student
        assert kpis["documents"]["value"] == 2
        assert kpis["flashcards"]["value"] == 4
        assert kpis["quiz_average"]["value"] == "75%"
        assert kpis["open_tasks"]["value"] == 2
        assert "1 overdue" in kpis["open_tasks"]["footer"]
        attention = [a["text"] for a in response.context["attention"]]
        assert attention == ["1 failed PDF", "1 overdue task", "1 unverified student"]

    def test_dashboard_progress_and_chart(self, admin_client, study_data):
        ctx = admin_client.get(reverse("admin:index")).context
        progress = {p["title"]: p["value"] for p in ctx["progress"]}
        assert progress["Email verified"] == 50
        assert progress["PDFs summarised"] == 50
        assert progress["AI-suggested cards"] == 25
        assert len(ctx["activity_chart_labels"]) == 14

    def test_dashboard_query_count_is_bounded(
        self, admin_client, study_data, django_assert_max_num_queries
    ):
        with django_assert_max_num_queries(30):
            admin_client.get(reverse("admin:index"))


def _request(client):
    from django.test import RequestFactory

    request = RequestFactory().get("/")
    request.user = User.objects.get(email="admin@example.com")
    return request


class TestDataDictionaryFieldsInAdmin:
    """Supervisor requirement: every field in the data dictionary is visible on the admin page."""

    # Credentials of a browser push subscription are shown masked, under their own label.
    MASKED = {"endpoint": "masked_endpoint", "p256dh": "masked_p256dh", "auth": "masked_auth"}

    @pytest.fixture
    def every_model(self, study_data):
        from apps.accounts.models import SocialAccount
        from apps.notifications.models import NotificationPreference, PushSubscription

        student = study_data["student"]
        SocialAccount.objects.create(
            user=student, provider="google", provider_uid="g-123", email=student.email
        )
        PushSubscription.objects.create(
            user=student,
            endpoint="https://push.example.com/send/abcdefghijklmnopqrstuvwxyz",
            p256dh="BPUBLICKEYSECRET0123456789",
            auth="AUTHSECRET0123456789",
        )
        NotificationPreference.objects.create(
            user=student, notification_type=NotificationType.QUIZ_GRADED
        )

    def _shown_fields(self, model_admin, request, obj):
        shown = set()
        for _name, opts in model_admin.get_fieldsets(request, obj):
            for field in opts["fields"]:
                shown.update(field if isinstance(field, (list, tuple)) else [field])
        return shown

    def test_every_field_of_every_data_dictionary_model_is_shown(self, admin_client, every_model):
        from apps.accounts.models import SocialAccount
        from apps.notifications.models import NotificationPreference, PushSubscription

        models = [
            User,
            SocialAccount,
            Task,
            Document,
            Summary,
            Deck,
            Flashcard,
            QuizSession,
            QuizQuestion,
            Notification,
            NotificationPreference,
            PushSubscription,
        ]
        request = _request(admin_client)
        for model in models:
            assert model in admin.site._registry, f"{model.__name__} is not in the admin"
            model_admin = admin.site._registry[model]
            obj = model.objects.first()
            shown = self._shown_fields(model_admin, request, obj)
            missing = [
                f.name
                for f in model._meta.concrete_fields
                if f.name not in shown and self.MASKED.get(f.name) not in shown
            ]
            assert not missing, f"{model.__name__} admin hides {missing}"

    def test_change_page_shows_ids_and_masks_push_secrets(self, admin_client, every_model):
        from apps.notifications.models import PushSubscription

        sub = PushSubscription.objects.get()
        url = reverse("admin:notifications_pushsubscription_change", args=[sub.pk])
        html = admin_client.get(url).content.decode()
        assert str(sub.pk) in html
        assert "AUTHSECRET0123456789" not in html
        assert "BPUBLICKEYSECRET0123456789" not in html
        assert "AUTHSEC…" in html

        question = QuizQuestion.objects.first()
        url = reverse("admin:quizzes_quizquestion_change", args=[question.pk])
        assert admin_client.get(url).status_code == 200
