from django.contrib import admin
from django.template.defaultfilters import filesizeformat
from django.utils.translation import gettext_lazy as _
from unfold.admin import ModelAdmin, StackedInline
from unfold.contrib.filters.admin import RangeDateFilter
from unfold.decorators import display

from .models import Document, Summary

STATUS_LABELS = {
    Document.Status.DONE.label: "success",
    Document.Status.FAILED.label: "danger",
    Document.Status.PROCESSING.label: "warning",
    Document.Status.UPLOADED.label: "info",
}


class SummaryInline(StackedInline):
    model = Summary
    extra = 0
    can_delete = False
    fields = ("ai_model_used", "content", "created_at")
    readonly_fields = fields
    tab = True


@admin.register(Document)
class DocumentAdmin(ModelAdmin):
    """PDFs are uploaded through the API pipeline only; the admin inspects them."""

    list_display = (
        "original_name",
        "user",
        "display_status",
        "page_count",
        "display_size",
        "created_at",
    )
    list_select_related = ("user",)
    list_filter = ("status", "flashcard_generation_status", ("created_at", RangeDateFilter))
    list_filter_submit = True
    search_fields = ("original_name", "user__email")
    readonly_fields = (
        "user",
        "file",
        "original_name",
        "size",
        "page_count",
        "status",
        "flashcard_generation_status",
        "flashcard_generation_started_at",
        "processing_started_at",
        "error_message",
        "extracted_text",
        "created_at",
        "updated_at",
    )
    fieldsets = (
        (None, {"fields": ("original_name", "user", "status", "error_message")}),
        (_("File"), {"classes": ["tab"], "fields": ("file", "size", "page_count")}),
        (
            _("Pipeline"),
            {
                "classes": ["tab"],
                "fields": (
                    "processing_started_at",
                    "flashcard_generation_status",
                    "flashcard_generation_started_at",
                    "created_at",
                    "updated_at",
                ),
            },
        ),
        (_("Extracted text"), {"classes": ["tab"], "fields": ("extracted_text",)}),
    )
    inlines = (SummaryInline,)

    def has_add_permission(self, request):
        return False

    @display(description=_("Status"), label=STATUS_LABELS, ordering="status")
    def display_status(self, obj):
        return obj.get_status_display()

    @display(description=_("Size"), ordering="size")
    def display_size(self, obj):
        return filesizeformat(obj.size)


@admin.register(Summary)
class SummaryAdmin(ModelAdmin):
    list_display = ("document", "ai_model_used", "created_at")
    list_select_related = ("document",)
    search_fields = ("document__original_name", "document__user__email")
    readonly_fields = ("document", "ai_model_used", "content", "created_at")

    def has_add_permission(self, request):
        return False
