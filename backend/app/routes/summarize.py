from fastapi import APIRouter, HTTPException
from groq import APIStatusError, AuthenticationError

from ..schemas import SummarizeRequest, SummarizeResponse
from ..services.summarize import summarize_content

router = APIRouter()

_GROQ_AUTH_HINT = (
    "Groq rejected this API key (invalid or revoked). "
    "Create a key at https://console.groq.com/keys. "
    "Put it in backend/.env as GROQ_API_KEY=gsk_... (that file overrides project root .env). "
    "Open GET /health to verify groq_api_key_format_ok without exposing the secret."
)


@router.post("/summarize", response_model=SummarizeResponse)
async def summarize(payload: SummarizeRequest) -> SummarizeResponse:
    try:
        summary = await summarize_content(
            payload.content,
            payload.sourceType,
            payload.audioStyle,
            payload.focusPrompt,
            payload.title,
            payload.outputLength,
            payload.detailLevel,
        )
        return SummarizeResponse(summary=summary)
    except AuthenticationError as err:
        raise HTTPException(status_code=502, detail=_GROQ_AUTH_HINT) from err
    except APIStatusError as err:
        if err.status_code == 401:
            raise HTTPException(status_code=502, detail=_GROQ_AUTH_HINT) from err
        raise HTTPException(status_code=500, detail=str(err)) from err
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err)) from err
