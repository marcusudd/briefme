import asyncio
from typing import Literal

from groq import Groq

from ..groq_key import load_groq_api_key_required

SourceType = Literal["youtube", "article", "file"]
AudioStyle = Literal["summary", "podcast"]
OutputLength = Literal["min", "med", "max"]

CHUNK_SIZE = 8000
DIRECT_THRESHOLD = 10000


def get_groq_client() -> Groq:
    return Groq(api_key=load_groq_api_key_required())


def source_label(source_type: SourceType) -> dict[str, str]:
    if source_type == "youtube":
        return {
            "kind": "YouTube video",
            "contentLabel": "Transcript",
            "titlePrefix": "Video",
        }
    if source_type == "file":
        return {
            "kind": "document or text file",
            "contentLabel": "Document text",
            "titlePrefix": "Document",
        }
    return {
        "kind": "article or web post",
        "contentLabel": "Article text",
        "titlePrefix": "Article",
    }


def _length_profile(output_length: OutputLength) -> dict[str, str | int]:
    if output_length == "min":
        return {
            "summary_spoken": "2 to 3 minutes",
            "podcast_spoken": "2 to 3 minutes of natural back-and-forth dialogue",
            "max_final": 720,
            "max_chunk": 320,
            "chunk_instruction": "Be concise; keep only the highest-signal points.",
        }
    if output_length == "med":
        return {
            "summary_spoken": "about 4 to 6 minutes (aim near 5 minutes)",
            "podcast_spoken": "about 4 to 6 minutes of dialogue (aim near 5 minutes)",
            "max_final": 1500,
            "max_chunk": 500,
            "chunk_instruction": "Capture important ideas with solid depth; stay organized.",
        }
    return {
        "summary_spoken": "about 8 to 10 minutes",
        "podcast_spoken": "about 8 to 10 minutes of rich, well-paced dialogue",
        "max_final": 3600,
        "max_chunk": 680,
        "chunk_instruction": "Be thorough; do not omit important ideas from this segment.",
    }


def _chat(model: str, prompt: str, temperature: float, max_tokens: int) -> str:
    client = get_groq_client()
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return (response.choices[0].message.content or "").strip()


def summarize_chunk(
    chunk: str,
    index: int,
    total: int,
    source_type: SourceType,
    output_length: OutputLength,
) -> str:
    label = source_label(source_type)["contentLabel"]
    prof = _length_profile(output_length)
    chunk_instr = str(prof["chunk_instruction"])
    max_chunk = int(prof["max_chunk"])
    prompt = (
        f"Extract the key points, insights, facts, and important information from this "
        f"{label.lower()} segment (part {index + 1} of {total}). "
        f"{chunk_instr} Write as plain sentences, no bullet points.\n\n"
        f"{label}:\n{chunk}"
    )
    return _chat("llama-3.1-8b-instant", prompt, 0.3, max_chunk)


def _summary_prompt(
    content: str,
    source_type: SourceType,
    audio_style: AudioStyle,
    focus_prompt: str | None,
    title: str | None,
    output_length: OutputLength,
) -> str:
    prof = _length_profile(output_length)
    spoken_summary = str(prof["summary_spoken"])
    spoken_podcast = str(prof["podcast_spoken"])
    labels = source_label(source_type)
    kind, content_label, title_prefix = (
        labels["kind"],
        labels["contentLabel"],
        labels["titlePrefix"],
    )
    focus_instruction = (
        f"\n\nSpecial focus instructions: {focus_prompt}" if focus_prompt else ""
    )
    title_context = f'{title_prefix}: "{title}"\n\n' if title else ""
    if source_type == "youtube":
        source_note = (
            "\n\nSource shape: video transcript—prefer clear spoken phrasing; explain anything "
            "that depended on seeing the video."
        )
    elif source_type == "file":
        source_note = (
            "\n\nSource shape: document or file—keep terminology consistent; "
            "define jargon briefly for a listener."
        )
    else:
        source_note = (
            "\n\nSource shape: article or web page—keep the main thread of the argument when helpful."
        )

    if audio_style == "podcast":
        return f"""You are writing an engaging two-host podcast script about a {kind} for someone who wants to learn efficiently.

{title_context}{content_label}:
{content}
{focus_instruction}{source_note}

Write a dialogue between two hosts:
- Adam (male voice): guides the discussion and explains concepts
- Jane (female voice): asks clarifying questions and adds concise explanations

The hosts should be collaborative and supportive.
- Do NOT argue against the source text
- Do NOT debate whether the source is wrong
- It's good for Jane to ask topic/text-focused questions that Adam explains

Write a dialogue that:
- Explains the ideas at a depth that fits the requested length
- Sounds natural and conversational
- Includes follow-up questions and clarifications where helpful
- Ends with practical takeaways
- Targets roughly {spoken_podcast} when read aloud (same script will become audio)

Format rules:
- Each spoken line MUST start with either "Adam:" or "Jane:"
- No markdown, no stage directions, no narration outside host lines"""

    return f"""You are a learning coach creating a spoken audio summary of a {kind} for someone who wants to learn efficiently.

{title_context}{content_label}:
{content}
{focus_instruction}{source_note}

Create a clear, engaging spoken summary that:
- Captures the key insights, concepts, and takeaways at a depth suited to the length below
- Is structured for listening (not reading), so avoid bullet points or markdown
- Uses natural spoken language with smooth transitions
- Targets roughly {spoken_summary} when read aloud (this will become an MP3)
- Starts with a brief intro of what the {kind} covers
- Ends with actionable takeaways (fewer for shorter lengths, more nuance for longer)

Write only the spoken summary text, nothing else."""


async def summarize_content(
    content: str,
    source_type: SourceType,
    audio_style: AudioStyle,
    focus_prompt: str | None = None,
    title: str | None = None,
    output_length: OutputLength = "med",
) -> str:
    max_final = int(_length_profile(output_length)["max_final"])
    if len(content) <= DIRECT_THRESHOLD:
        prompt = _summary_prompt(
            content, source_type, audio_style, focus_prompt, title, output_length
        )
        return _chat("llama-3.3-70b-versatile", prompt, 0.7, max_final)

    chunks = [content[i : i + CHUNK_SIZE] for i in range(0, len(content), CHUNK_SIZE)]
    chunk_summaries: list[str] = []
    for i, chunk in enumerate(chunks):
        chunk_summaries.append(
            summarize_chunk(chunk, i, len(chunks), source_type, output_length)
        )
        if i < len(chunks) - 1:
            await asyncio.sleep(3)

    combined_notes = "\n\n".join([f"[Part {i + 1}]\n{s}" for i, s in enumerate(chunk_summaries)])
    await asyncio.sleep(2)
    prompt = _summary_prompt(
        combined_notes, source_type, audio_style, focus_prompt, title, output_length
    )
    return _chat("llama-3.3-70b-versatile", prompt, 0.7, max_final)
