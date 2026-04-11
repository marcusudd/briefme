import re
from io import BytesIO

from docx import Document
from pypdf import PdfReader


def get_file_title(name: str) -> str:
    return re.sub(r"\.[^/.]+$", "", name) or "Uploaded file"


def is_text_like(filename: str, content_type: str) -> bool:
    lower = filename.lower()
    return content_type.startswith("text/") or lower.endswith(
        (".txt", ".md", ".csv", ".json", ".xml", ".log")
    )


def is_docx(filename: str, content_type: str) -> bool:
    return (
        content_type
        == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        or filename.lower().endswith(".docx")
    )


def is_pdf(filename: str, content_type: str) -> bool:
    return content_type == "application/pdf" or filename.lower().endswith(".pdf")


def extract_pdf_text(data: bytes) -> str:
    reader = PdfReader(BytesIO(data))
    pages = [(page.extract_text() or "") for page in reader.pages]
    return "\n".join(pages)


def extract_docx_text(data: bytes) -> str:
    doc = Document(BytesIO(data))
    paragraphs = [p.text for p in doc.paragraphs if p.text]
    return "\n".join(paragraphs)


def normalize_text(content: str) -> str:
    return re.sub(r"\s+", " ", content).strip()
