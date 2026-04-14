from . import env_loader as _env_loader  # noqa: F401

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes.extract import router as extract_router
from .routes.news import router as news_router
from .routes.summarize import router as summarize_router
from .routes.tts import router as tts_router
from .groq_key import groq_key_env_status

app = FastAPI(title="YT MP3 Python Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(extract_router)
app.include_router(news_router)
app.include_router(summarize_router)
app.include_router(tts_router)


@app.get("/health")
def health() -> dict:
    body: dict = {"status": "ok"}
    body.update(groq_key_env_status())
    return body
