import re
import json
import os
from pathlib import Path
from http.cookiejar import MozillaCookieJar
from html import unescape
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse
from xml.etree import ElementTree

import httpx
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    CouldNotRetrieveTranscript,
    NoTranscriptAvailable,
    NoTranscriptFound,
    TooManyRequests,
    TranscriptsDisabled,
    VideoUnavailable,
)


def _normalize_caption_text(text: str) -> str:
    return re.sub(r"\s+", " ", unescape(text)).strip()


def _resolve_youtube_cookies_path() -> str | None:
    """Env path wins; else `backend/youtube_cookies.txt` if present (no env needed)."""
    env_path = os.getenv("YOUTUBE_COOKIES_PATH", "").strip()
    if env_path and os.path.isfile(env_path):
        return env_path
    # backend/app/services/extract_youtube.py -> backend/
    backend_dir = Path(__file__).resolve().parent.parent.parent
    default = backend_dir / "youtube_cookies.txt"
    if default.is_file():
        return str(default)
    return None


def _youtube_cookies():
    cookies_path = _resolve_youtube_cookies_path()
    if not cookies_path:
        return None
    try:
        jar = MozillaCookieJar(cookies_path)
        jar.load(ignore_discard=True, ignore_expires=True)
        return jar
    except Exception:
        return None


def _youtube_cookies_dict() -> dict[str, str] | None:
    """Flat dict for httpx: youtube + google session cookies from Netscape export."""
    jar = _youtube_cookies()
    if not jar:
        return None
    out: dict[str, str] = {}
    for cookie in jar:
        domain = (cookie.domain or "").lstrip(".").lower()
        if "youtube" not in domain and "google.com" not in domain:
            continue
        if cookie.name and cookie.value is not None:
            # Last wins on duplicate names (rare); fine for session cookies.
            out[cookie.name] = cookie.value
    return out or None


def _normalize_segments_text(segments: list[dict]) -> str:
    text = " ".join([segment.get("text", "") for segment in segments])
    return re.sub(r"\s+", " ", text).strip()


def _fetch_transcript_via_list(video_id: str) -> str:
    transcript_list = YouTubeTranscriptApi.list_transcripts(
        video_id, cookies=_youtube_cookies()
    )

    # Try the most common successful paths first.
    attempts = [
        lambda: transcript_list.find_transcript(["en"]).fetch(),
        lambda: transcript_list.find_generated_transcript(["en"]).fetch(),
        lambda: next(iter(transcript_list)).fetch(),
    ]
    for attempt in attempts:
        try:
            segments = attempt()
            normalized = _normalize_segments_text(segments)
            if normalized:
                return normalized
        except Exception:
            continue

    # Final pass: walk all transcripts and translate when possible.
    try:
        for transcript in transcript_list:
            try:
                segments = transcript.fetch()
                normalized = _normalize_segments_text(segments)
                if normalized:
                    return normalized
                if getattr(transcript, "is_translatable", False):
                    translated = transcript.translate("en").fetch()
                    normalized = _normalize_segments_text(translated)
                    if normalized:
                        return normalized
            except Exception:
                continue
    except Exception:
        pass

    raise ValueError("Transcript list did not yield any non-empty captions.")


async def _fetch_watch_page(video_id: str) -> str:
    url = f"https://www.youtube.com/watch?v={video_id}&hl=en"
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "en-US,en;q=0.9",
    }
    cookies = _youtube_cookies_dict()
    async with httpx.AsyncClient(
        timeout=20.0, follow_redirects=True, cookies=cookies
    ) as client:
        res = await client.get(url, headers=headers)
    if res.status_code != 200:
        raise ValueError(f"Failed to fetch YouTube watch page (HTTP {res.status_code}).")
    return res.text


def _balanced_json_from(html: str, brace_start: int) -> str | None:
    """Parse one JSON object starting at brace_start (handles strings with `{`)."""
    depth = 0
    in_string: str | None = None
    escape = False
    i = brace_start
    while i < len(html):
        ch = html[i]
        if in_string:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == in_string:
                in_string = None
            i += 1
            continue
        if ch in ('"', "'"):
            in_string = ch
            i += 1
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return html[brace_start : i + 1]
        i += 1
    return None


def _extract_yt_initial_player_response_json(watch_html: str) -> dict:
    """YouTube embeds a large JSON blob; non-greedy regex breaks — use brace matching."""
    patterns = [
        r"ytInitialPlayerResponse\s*=\s*",
        r"var\s+ytInitialPlayerResponse\s*=\s*",
    ]
    brace_start: int | None = None
    for pat in patterns:
        m = re.search(pat, watch_html)
        if m:
            j = watch_html.find("{", m.end())
            if j != -1:
                brace_start = j
                break
    if brace_start is None:
        raise ValueError("Could not locate YouTube player response in watch page HTML.")

    json_blob = _balanced_json_from(watch_html, brace_start)
    if not json_blob:
        raise ValueError("YouTube player response JSON appears truncated in HTML.")

    try:
        return json.loads(json_blob)
    except json.JSONDecodeError as err:
        raise ValueError("YouTube player response JSON could not be parsed.") from err


def _extract_caption_base_url_from_watch_html(watch_html: str) -> str:
    player_response = _extract_yt_initial_player_response_json(watch_html)
    tracks = (
        player_response.get("captions", {})
        .get("playerCaptionsTracklistRenderer", {})
        .get("captionTracks", [])
    )
    if not tracks:
        raise ValueError("No caption tracks were found in YouTube player response.")

    english_track = next(
        (t for t in tracks if str(t.get("languageCode", "")).startswith("en")), None
    )
    selected = english_track or tracks[0]
    base_url = selected.get("baseUrl")
    if not base_url:
        raise ValueError("YouTube caption track missing base URL.")
    return base_url


def _set_query_params(url: str, **params: str) -> str:
    parsed = urlparse(url)
    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query.update(params)
    return urlunparse(parsed._replace(query=urlencode(query)))


async def _fetch_caption_text(url: str) -> str:
    cookies = _youtube_cookies_dict()
    async with httpx.AsyncClient(
        timeout=20.0, follow_redirects=True, cookies=cookies
    ) as client:
        res = await client.get(url)
    if res.status_code != 200:
        raise ValueError(f"Failed to fetch YouTube caption track (HTTP {res.status_code}).")
    return res.text


def _parse_caption_json3(json_text: str) -> str:
    payload = json.loads(json_text)
    lines: list[str] = []
    for event in payload.get("events", []):
        for seg in event.get("segs", []) or []:
            text = seg.get("utf8", "")
            if text:
                normalized = _normalize_caption_text(text)
                if normalized:
                    lines.append(normalized)
    return re.sub(r"\s+", " ", " ".join(lines)).strip()


def _parse_caption_xml(xml_text: str) -> str:
    root = ElementTree.fromstring(xml_text)
    lines: list[str] = []
    for node in root.findall(".//text"):
        if node.text:
            normalized = _normalize_caption_text(node.text)
            if normalized:
                lines.append(normalized)
    return re.sub(r"\s+", " ", " ".join(lines)).strip()


def _parse_caption_vtt(vtt_text: str) -> str:
    lines: list[str] = []
    for raw in vtt_text.splitlines():
        line = raw.strip()
        if not line:
            continue
        if line.upper().startswith("WEBVTT"):
            continue
        if "-->" in line:
            continue
        if re.match(r"^\d+$", line):
            continue
        normalized = _normalize_caption_text(line)
        if normalized:
            lines.append(normalized)
    return re.sub(r"\s+", " ", " ".join(lines)).strip()


def _parse_caption_payload(payload: str) -> str:
    stripped = payload.lstrip()
    if not stripped:
        return ""
    if stripped.startswith("{"):
        try:
            return _parse_caption_json3(payload)
        except Exception:
            return ""
    if stripped.startswith("<"):
        try:
            return _parse_caption_xml(payload)
        except Exception:
            return ""
    if "WEBVTT" in stripped[:100]:
        return _parse_caption_vtt(payload)
    return ""


async def _fallback_fetch_captions(video_id: str) -> str:
    watch_html = await _fetch_watch_page(video_id)
    base_url = _extract_caption_base_url_from_watch_html(watch_html)
    candidate_urls = [
        _set_query_params(base_url, fmt="json3", tlang="en"),
        _set_query_params(base_url, fmt="srv3", tlang="en"),
        _set_query_params(base_url, fmt="vtt", tlang="en"),
        _set_query_params(base_url, tlang="en"),
        _set_query_params(base_url, fmt="json3"),
        _set_query_params(base_url, fmt="srv3"),
        _set_query_params(base_url, fmt="vtt"),
        base_url,
    ]

    seen: set[str] = set()
    for url in candidate_urls:
        if url in seen:
            continue
        seen.add(url)
        try:
            payload = await _fetch_caption_text(url)
            parsed = _parse_caption_payload(payload)
            if parsed:
                return parsed
        except Exception:
            continue
    raise ValueError("Fallback extractor returned empty captions.")


def extract_video_id(url: str) -> str:
    cleaned = url.strip()
    patterns = [
        r"[?&]v=([a-zA-Z0-9_-]{11})",
        r"youtu\.be/([a-zA-Z0-9_-]{11})",
        r"youtube\.com/embed/([a-zA-Z0-9_-]{11})",
        r"youtube\.com/shorts/([a-zA-Z0-9_-]{11})",
        r"^([a-zA-Z0-9_-]{11})$",
    ]
    for pattern in patterns:
        match = re.search(pattern, cleaned)
        if match:
            return match.group(1)
    raise ValueError(
        f'Could not extract a YouTube video ID from: "{cleaned}". Please paste the full YouTube URL.'
    )


async def fetch_captions(video_url: str) -> str:
    video_id = extract_video_id(video_url)
    # With a cookie jar, list+fetch often works when get_transcript fails (age/region gates).
    if _youtube_cookies():
        try:
            return _fetch_transcript_via_list(video_id)
        except Exception:
            pass
    try:
        transcript = YouTubeTranscriptApi.get_transcript(
            video_id, cookies=_youtube_cookies()
        )
    except VideoUnavailable as err:
        raise ValueError(
            "This YouTube video is unavailable. Please verify the URL and access permissions."
        ) from err
    except TranscriptsDisabled as err:
        raise ValueError(
            "Captions are disabled for this video. Try another video or upload a file instead."
        ) from err
    except (NoTranscriptFound, NoTranscriptAvailable) as err:
        raise ValueError(
            "No captions/transcript were found for this video. Try another video, or use article/file input."
        ) from err
    except TooManyRequests as err:
        raise ValueError(
            "YouTube temporarily rate-limited transcript requests. Please wait a minute and try again."
        ) from err
    except CouldNotRetrieveTranscript as err:
        try:
            return _fetch_transcript_via_list(video_id)
        except Exception:
            pass
        try:
            return await _fallback_fetch_captions(video_id)
        except Exception:
            raw_message = str(err).strip().lower()
            if "no element found" in raw_message:
                raise ValueError(
                    "Could not retrieve captions from YouTube (empty transcript response). "
                    "Try again shortly or use another source."
                ) from err
            raise ValueError(
                "Could not retrieve captions from YouTube for this video. "
                "It may be restricted by your region/session. "
                "Save a Netscape cookies.txt export while logged into youtube.com as "
                "`backend/youtube_cookies.txt` (auto-detected), or set YOUTUBE_COOKIES_PATH, "
                "then restart the backend and retry."
            ) from err
    except Exception as err:
        raw_message = str(err).strip()
        if "no element found" in raw_message.lower():
            try:
                return _fetch_transcript_via_list(video_id)
            except Exception:
                pass
            try:
                return await _fallback_fetch_captions(video_id)
            except Exception:
                raise ValueError(
                    "Could not retrieve captions from YouTube (empty transcript response). "
                    "Try again shortly or use another source."
                ) from err
        raise ValueError(
            "Unexpected transcript parsing error from YouTube. "
            "Try another video or source."
        ) from err

    normalized = _normalize_segments_text(transcript)
    if not normalized:
        raise ValueError(
            "Captions were fetched but empty after parsing. Try another video or source."
        )
    return normalized


async def get_video_title(url: str) -> str:
    try:
        video_id = extract_video_id(url)
        oembed_url = (
            "https://www.youtube.com/oembed"
            f"?url=https://www.youtube.com/watch?v={video_id}&format=json"
        )
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(oembed_url)
        if res.status_code == 200:
            data = res.json()
            return data.get("title") or f"Video {video_id}"
    except Exception:
        pass
    return url
