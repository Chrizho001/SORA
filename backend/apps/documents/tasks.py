import pypdf
from celery import shared_task
from django.db import transaction
from apps.documents.models import Document, Summary
from apps.documents.ai import SummarizerClient


@shared_task
def process_document(document_id: str):
    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        return

    # Set status to PROCESSING
    document.status = Document.Status.PROCESSING
    document.save(update_fields=["status"])

    try:
        # Extract Text
        extracted_text = ""
        page_count = 0
        
        with document.file.open('rb') as f:
            pdf = pypdf.PdfReader(f)
            if pdf.is_encrypted:
                raise ValueError("PDF is encrypted and cannot be processed.")
                
            page_count = len(pdf.pages)
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
                    
        if not extracted_text.strip():
            raise ValueError("No text could be extracted from this PDF. It may be an image-only PDF.")
            
        document.page_count = page_count
        document.extracted_text = extracted_text.strip()
        document.save(update_fields=["page_count", "extracted_text"])

        # Summarize
        client = SummarizerClient()
        summary_content = client.summarize(document.extracted_text)
        
        # Save Summary and update status
        with transaction.atomic():
            Summary.objects.create(
                document=document,
                content=summary_content,
                ai_model_used="mock-model"
            )
            document.status = Document.Status.DONE
            document.save(update_fields=["status"])

    except Exception as e:
        document.status = Document.Status.FAILED
        document.error_message = str(e)
        document.save(update_fields=["status", "error_message"])
