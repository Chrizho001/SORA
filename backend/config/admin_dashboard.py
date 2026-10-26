"""
Callbacks for the django-unfold admin (settings.UNFOLD): environment badge, sidebar badge and the
dashboard KPIs rendered by templates/admin/index.html.

Every number comes from a fixed set of aggregate queries, so the dashboard cost does not grow
with data.
"""

import json
from datetime import timedelta

from django.conf import settings
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.urls import reverse
from django.utils import timezone

from apps.accounts.models import User
from apps.documents.models import Document
from apps.flashcards.models import Deck, Flashcard
from apps.quizzes.models import QuizSession
from apps.tasks.models import Task

CHART_DAYS = 14


def environment_callback(request):
    if settings.DEBUG:
        return ["Development", "info"]
    return ["Production", "success"]


def failed_documents_badge(request):
    failed = Document.objects.filter(status=Document.Status.FAILED).count()
    return failed or None


def _pct(part, whole):
    return round(part * 100 / whole) if whole else 0


def _changelist(model, query=""):
    opts = model._meta
    url = reverse(f"admin:{opts.app_label}_{opts.model_name}_changelist")
    return f"{url}?{query}" if query else url


def _daily_counts(queryset, field, start):
    rows = (
        queryset.filter(**{f"{field}__gte": start})
        .annotate(day=TruncDate(field))
        .values("day")
        .annotate(n=Count("pk"))
    )
    return {row["day"]: row["n"] for row in rows}


def _plural(n, word):
    return f"{n} {word}" if n == 1 else f"{n} {word}s"


def _attention(failed, overdue, unverified):
    """Badges in the dashboard header for things an operator should look at."""
    items = [
        (
            failed,
            _plural(failed, "failed PDF"),
            "danger",
            _changelist(Document, f"status__exact={Document.Status.FAILED}"),
        ),
        (
            overdue,
            _plural(overdue, "overdue task"),
            "warning",
            _changelist(Task, "is_completed__exact=0"),
        ),
        (
            unverified,
            _plural(unverified, "unverified student"),
            "info",
            _changelist(User, "is_email_verified__exact=0"),
        ),
    ]
    return [
        {"text": text, "variant": variant, "href": href} for n, text, variant, href in items if n
    ]


def dashboard_callback(request, context):
    now = timezone.now()
    week_ago = now - timedelta(days=7)

    students = User.objects.filter(is_staff=False).aggregate(
        total=Count("pk"),
        verified=Count("pk", filter=Q(is_email_verified=True)),
        new_week=Count("pk", filter=Q(date_joined__gte=week_ago)),
    )
    documents = Document.objects.aggregate(
        total=Count("pk"),
        done=Count("pk", filter=Q(status=Document.Status.DONE)),
        failed=Count("pk", filter=Q(status=Document.Status.FAILED)),
        in_flight=Count(
            "pk", filter=Q(status__in=[Document.Status.UPLOADED, Document.Status.PROCESSING])
        ),
    )
    cards = Flashcard.objects.aggregate(
        total=Count("pk"), ai=Count("pk", filter=Q(source=Flashcard.Source.AI))
    )
    deck_count = Deck.objects.count()
    quizzes = QuizSession.objects.filter(finished_at__isnull=False).aggregate(
        finished=Count("pk"), correct=Sum("score"), asked=Sum("total_questions")
    )
    tasks = Task.objects.aggregate(
        open=Count("pk", filter=Q(is_completed=False)),
        overdue=Count("pk", filter=Q(is_completed=False, due_at__lt=now)),
        done_week=Count("pk", filter=Q(is_completed=True, completed_at__gte=week_ago)),
    )

    quiz_average = _pct(quizzes["correct"] or 0, quizzes["asked"] or 0)

    kpis = [
        {
            "key": "students",
            "title": "Students",
            "icon": "group",
            "value": students["total"],
            "footer": f"+{students['new_week']} in the last 7 days",
            "href": _changelist(User, "is_staff__exact=0"),
        },
        {
            "key": "documents",
            "title": "PDFs uploaded",
            "icon": "picture_as_pdf",
            "value": documents["total"],
            "footer": f"{documents['failed']} failed · {documents['in_flight']} in progress",
            "href": _changelist(Document),
        },
        {
            "key": "flashcards",
            "title": "Flashcards",
            "icon": "layers",
            "value": cards["total"],
            "footer": f"across {deck_count} deck{'s' if deck_count != 1 else ''}",
            "href": _changelist(Flashcard),
        },
        {
            "key": "quiz_average",
            "title": "Average quiz score",
            "icon": "quiz",
            "value": f"{quiz_average}%",
            "footer": f"{quizzes['finished']} quizzes completed",
            "href": _changelist(QuizSession),
        },
        {
            "key": "open_tasks",
            "title": "Open tasks",
            "icon": "task_alt",
            "value": tasks["open"],
            "footer": f"{tasks['overdue']} overdue · {tasks['done_week']} done this week",
            "href": _changelist(Task, "is_completed__exact=0"),
        },
    ]

    progress = [
        {
            "title": "Email verified",
            "value": _pct(students["verified"], students["total"]),
            "description": f"{students['verified']} of {students['total']} students",
        },
        {
            "title": "PDFs summarised",
            "value": _pct(documents["done"], documents["total"]),
            "description": f"{documents['done']} of {documents['total']} documents",
        },
        {
            "title": "AI-suggested cards",
            "value": _pct(cards["ai"], cards["total"]),
            "description": f"{cards['ai']} AI · {cards['total'] - cards['ai']} by students",
        },
        {
            "title": "Quiz accuracy",
            "value": quiz_average,
            "description": f"{quizzes['correct'] or 0} of {quizzes['asked'] or 0} answers correct",
        },
    ]

    # Activity over the last CHART_DAYS days (one query per series).
    today = timezone.localdate()
    days = [today - timedelta(days=offset) for offset in range(CHART_DAYS - 1, -1, -1)]
    start = now - timedelta(days=CHART_DAYS)
    series = [
        (
            "New students",
            _daily_counts(User.objects.filter(is_staff=False), "date_joined", start),
            "var(--color-primary-600)",
        ),
        (
            "PDFs uploaded",
            _daily_counts(Document.objects.all(), "created_at", start),
            "var(--color-base-400)",
        ),
        (
            "Quizzes finished",
            _daily_counts(
                QuizSession.objects.filter(finished_at__isnull=False), "finished_at", start
            ),
            "var(--color-primary-300)",
        ),
    ]
    labels = [day.strftime("%d %b") for day in days]
    chart = {
        "labels": labels,
        "datasets": [
            {
                "label": label,
                "data": [counts.get(day, 0) for day in days],
                "backgroundColor": color,
                # Unfold's defaults overlap series in 4px bars; group them side by side instead.
                "grouped": True,
                "maxBarThickness": 10,
                "barPercentage": 0.9,
                "categoryPercentage": 0.75,
                "borderRadius": 4,
            }
            for label, counts, color in series
        ],
    }

    recent_documents = Document.objects.select_related("user").order_by("-created_at")[:6]
    recent_quizzes = (
        QuizSession.objects.filter(finished_at__isnull=False)
        .select_related("user")
        .order_by("-finished_at")[:6]
    )

    context.update(
        {
            "kpis": kpis,
            "progress": progress,
            "activity_chart_labels": labels,
            "activity_chart": json.dumps(chart),
            "activity_legend": [{"label": label, "color": color} for label, _, color in series],
            "recent_documents": recent_documents,
            "recent_quizzes": recent_quizzes,
            "attention": _attention(
                failed=documents["failed"],
                overdue=tasks["overdue"],
                unverified=students["total"] - students["verified"],
            ),
        }
    )
    return context
