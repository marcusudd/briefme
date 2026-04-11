from fastapi import APIRouter, File, HTTPException, UploadFile

from ..schemas import ExtractRequest, ExtractResponse
from ..services.detect import detect_source_type
from ..services.extract_article import fetch_article
from ..services.extract_file import (
    extract_docx_text,
    extract_pdf_text,
    get_file_title,
    is_docx,
    is_pdf,
    is_text_like,
    normalize_text,
)
from ..services.extract_youtube import fetch_captions, get_video_title
from ..url_normalize import normalize_fetch_url

router = APIRouter()


@router.post("/extract", response_model=ExtractResponse)
async def extract_url(payload: ExtractRequest) -> ExtractResponse:
    try:
        url = normalize_fetch_url(payload.url)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    source_type = detect_source_type(url)
    try:
        if source_type == "youtube":
            content = await fetch_captions(url)
            title = await get_video_title(url)
        else:
            content, title = await fetch_article(url)
        return ExtractResponse(content=content, title=title, sourceType=source_type)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))


@router.post("/extract-file", response_model=ExtractResponse)
async def extract_file(file: UploadFile = File(...)) -> ExtractResponse:
    try:
        filename = file.filename or "uploaded-file"
        content_type = file.content_type or ""
        data = await file.read()
        title = get_file_title(filename)
        text = ""

        if is_pdf(filename, content_type):
            text = extract_pdf_text(data)
        elif is_docx(filename, content_type):
            text = extract_docx_text(data)
        elif is_text_like(filename, content_type):
            text = data.decode("utf-8", errors="ignore")
        else:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Unsupported file type. Please upload PDF, DOCX, or text-based "
                    "files (txt, md, csv, json, xml, log)."
                ),
            )

        content = normalize_text(text)
        if not content:
            raise HTTPException(
                status_code=400, detail="Could not extract text content from this file."
            )

        return ExtractResponse(content=content, title=title, sourceType="file")
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))
