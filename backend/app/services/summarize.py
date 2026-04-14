import asyncio
from typing import Literal

from groq import Groq

from ..groq_key import load_groq_api_key_required

SourceType = Literal["youtube", "article", "file"]
AudioStyle = Literal["summary", "podcast"]
OutputLength = Literal["min", "med", "max"]
DetailLevel = Literal["essentials", "detailed", "thorough"]

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


def _length_profile(
    output_length: OutputLength, detail_level: DetailLevel = "detailed"
) -> dict[str, str | int]:
    chunk_profiles: dict[DetailLevel, dict[str, str | int]] = {
        "essentials": {
            "max_chunk": 320,
            "chunk_instruction": (
                "Keep only the core claims, conclusions, and action items. "
                "Skip tangents and supporting anecdotes."
            ),
        },
        "detailed": {
            "max_chunk": 520,
            "chunk_instruction": (
                "Capture key points with their supporting evidence, stats, and examples. "
                "Skip tangents."
            ),
        },
        "thorough": {
            "max_chunk": 800,
            "chunk_instruction": (
                "Be thorough — preserve all points, nuance, caveats, and context. "
                "Do not omit."
            ),
        },
    }
    final_profiles: dict[OutputLength, dict[str, str | int]] = {
        "min": {
            "max_final": 900,
            "summary_spoken": "2 to 4 minutes",
            "podcast_spoken": "2 to 4 minutes of natural back-and-forth dialogue",
        },
        "med": {
            "max_final": 1800,
            "summary_spoken": "about 5 to 7 minutes",
            "podcast_spoken": "about 5 to 7 minutes of dialogue",
        },
        "max": {
            "max_final": 3600,
            "summary_spoken": "about 8 to 12 minutes",
            "podcast_spoken": "about 8 to 12 minutes of rich, well-paced dialogue",
        },
    }
    return {**chunk_profiles[detail_level], **final_profiles[output_length]}


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
    detail_level: DetailLevel = "detailed",
) -> str:
    label = source_label(source_type)["contentLabel"]
    prof = _length_profile("med", detail_level)
    chunk_instr = str(prof["chunk_instruction"])
    max_chunk = int(prof["max_chunk"])
    prompt = (
        f"Extract the key points, insights, facts, and important information from this "
        f"{label.lower()} segment (part {index + 1} of {total}). "
        f"{chunk_instr} Write as plain sentences, no bullet points.\n\n"
        f"{label}:\n{chunk}"
    )
    return _chat("llama-3.1-8b-instant", prompt, 0.3, max_chunk)


_DETAIL_INSTRUCTIONS: dict[str, str] = {
    "essentials": (
        "Cover ONLY the core thesis, key conclusions, and actionable takeaways. "
        "Skip supporting anecdotes, tangential points, and background context."
    ),
    "detailed": (
        "Cover the key points along with their supporting evidence, statistics, and examples. "
        "Skip tangential asides but keep anything that strengthens understanding."
    ),
    "thorough": (
        "Cover everything — include nuance, caveats, supporting context, and lesser points. "
        "Do not omit information that could matter to someone studying this material."
    ),
}


def _summary_prompt(
    content: str,
    source_type: SourceType,
    audio_style: AudioStyle,
    focus_prompt: str | None,
    title: str | None,
    output_length: OutputLength,
    detail_level: DetailLevel = "detailed",
) -> str:
    prof = _length_profile(output_length, detail_level)
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
    detail_instruction = _DETAIL_INSTRUCTIONS[detail_level]
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

    length_guardrail = (
        f"The maximum length is roughly {spoken_summary} when read aloud (this will become an MP3). "
        "Do NOT pad or stretch to fill that time — if the material only warrants a shorter summary, make it shorter. "
        "The goal is to learn efficiently, not to listen to filler. "
        "However, if covering the material at the requested detail level needs slightly more time, that is fine — "
        "never cut important information just to hit a time target."
    )

    if audio_style == "podcast":
        podcast_guardrail = (
            f"The maximum length is roughly {spoken_podcast} when read aloud (same script will become audio). "
            "Do NOT pad or stretch to fill that time — if the material only warrants a shorter discussion, keep it shorter. "
            "The goal is to help the listener learn efficiently, not to fill airtime. "
            "However, if the material needs slightly more time at the requested detail level, that is fine."
        )
        return f"""You are writing an engaging two-host podcast script about a {kind} for someone who wants to learn efficiently.

{title_context}{content_label}:
{content}
{focus_instruction}{source_note}

Detail level: {detail_instruction}

Write a dialogue between two hosts:
- Adam (male voice): guides the discussion and explains concepts
- Jane (female voice): asks clarifying questions and adds concise explanations

The hosts should be collaborative and supportive.
- Do NOT argue against the source text
- Do NOT debate whether the source is wrong
- It's good for Jane to ask topic/text-focused questions that Adam explains

Write a dialogue that:
- Explains the ideas at the detail level described above
- Sounds natural and conversational
- Includes follow-up questions and clarifications where helpful
- Ends with practical takeaways

{podcast_guardrail}

Format rules:
- Each spoken line MUST start with either "Adam:" or "Jane:"
- No markdown, no stage directions, no narration outside host lines"""

    return f"""You are a learning coach creating a spoken audio summary of a {kind} for someone who wants to learn efficiently.

{title_context}{content_label}:
{content}
{focus_instruction}{source_note}

Detail level: {detail_instruction}

Create a clear, engaging spoken summary that:
- Captures information at the detail level described above
- Is structured for listening (not reading), so avoid bullet points or markdown
- Uses natural spoken language with smooth transitions
- Starts with a brief intro of what the {kind} covers
- Ends with actionable takeaways

{length_guardrail}

Write only the spoken summary text, nothing else."""


async def summarize_content(
    content: str,
    source_type: SourceType,
    audio_style: AudioStyle,
    focus_prompt: str | None = None,
    title: str | None = None,
    output_length: OutputLength = "med",
    detail_level: DetailLevel = "detailed",
) -> str:
    max_final = int(_length_profile(output_length, detail_level)["max_final"])
    if len(content) <= DIRECT_THRESHOLD:
        prompt = _summary_prompt(
            content, source_type, audio_style, focus_prompt, title,
            output_length, detail_level,
        )
        return _chat("llama-3.3-70b-versatile", prompt, 0.7, max_final)

    chunks = [content[i : i + CHUNK_SIZE] for i in range(0, len(content), CHUNK_SIZE)]
    chunk_summaries: list[str] = []
    for i, chunk in enumerate(chunks):
        chunk_summaries.append(
            summarize_chunk(chunk, i, len(chunks), source_type, detail_level)
        )
        if i < len(chunks) - 1:
            await asyncio.sleep(3)

    combined_notes = "\n\n".join([f"[Part {i + 1}]\n{s}" for i, s in enumerate(chunk_summaries)])
    await asyncio.sleep(2)
    prompt = _summary_prompt(
        combined_notes, source_type, audio_style, focus_prompt, title,
        output_length, detail_level,
    )
    return _chat("llama-3.3-70b-versatile", prompt, 0.7, max_final)
