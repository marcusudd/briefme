import base64

from fastapi import APIRouter, HTTPException

from ..schemas import TTSRequest, TTSResponse
from ..services.tts import synthesize_podcast_dialogue, synthesize_speech

router = APIRouter()


@router.post("/tts", response_model=TTSResponse)
async def tts(payload: TTSRequest) -> TTSResponse:
    try:
        audio = (
            await synthesize_podcast_dialogue(payload.text)
            if payload.audioStyle == "podcast"
            else await synthesize_speech(payload.text)
        )
        return TTSResponse(audioBase64=base64.b64encode(audio).decode("utf-8"))
    except Exception as err:
        raise HTTPException(status_code=500, detail=str(err))
