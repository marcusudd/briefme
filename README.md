# BriefMe - URL/File to MP3 Summaries

Turn YouTube videos, articles, and documents into AI-summarized MP3 audio. Works on desktop and mobile browsers.

## What it does

1. Add one or more sources:
   - YouTube URLs
   - Article/blog URLs
   - File upload (PDF, DOCX, TXT/MD/CSV/JSON/XML/LOG)
2. Optionally add a focus prompt
3. Choose:
   - `combined` output (one MP3)
   - `separate` output (one MP3 per source)
4. Choose audio style:
   - `summary` narration
   - `podcast` discussion (Adam + Jane voices)
5. Listen in-app and/or download MP3 files

## Architecture

- Frontend: Next.js + React (JavaScript only)
- Backend: FastAPI (Python)
- AI summary/title: Groq
- TTS: Edge TTS

The frontend orchestrates `extract -> summarize -> tts` against the Python backend.

## Environment Setup

### Frontend `.env.local`

```bash
cp .env.local.example .env.local
```

Required value:

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### Backend env

Create backend env file from template:

```bash
cp backend/.env.example backend/.env
```

Required value:

```bash
GROQ_API_KEY=your_groq_api_key_here
```

Optional (helps with some YouTube videos that require authenticated caption access):

```bash
YOUTUBE_COOKIES_PATH=/absolute/path/to/cookies.txt
```

## Run Locally

### 1) Start backend (FastAPI)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
set -a; source backend/.env; set +a
uvicorn backend.app.main:app --reload --port 8000
```

### 2) Start frontend (Next.js)

In a second terminal:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- `next`, `react`, `tailwindcss`
- `fastapi`, `uvicorn`
- `youtube-transcript-api`
- `readability-lxml`, `beautifulsoup4`
- `pypdf`, `python-docx`
- `groq`
- `edge-tts`

## Notes

- YouTube sources require available captions/subtitles.
- Some article pages may block scraping or require login.
- Groq calls for long content use map-reduce chunking for reliability.
