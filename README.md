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

Optional (when YouTube blocks transcript fetches without a session):

**Easiest:** save Netscape-format cookies as `backend/youtube_cookies.txt` (this path is auto-used and gitignored). Restart the backend.

**Or** set an explicit path in `backend/.env`:

```bash
YOUTUBE_COOKIES_PATH=/absolute/path/to/youtube_cookies.txt
```

**Export `cookies.txt` (Netscape format)**

1. Log in to [youtube.com](https://www.youtube.com) in Chrome or Firefox.
2. Use a browser extension that exports **Netscape / cookies.txt** for the current site.
3. Export cookies for `youtube.com` and save the file as `backend/youtube_cookies.txt` in this repo (or any path + `YOUTUBE_COOKIES_PATH`).
4. Restart the backend and retry the video.

Without a valid cookie file, some videos will still fail (hard blocks). Then use another video or upload a file instead.

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
