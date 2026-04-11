import edge_tts

VoiceName = str


async def synthesize_speech_with_voice(text: str, voice: VoiceName) -> bytes:
    communicate = edge_tts.Communicate(text, voice)
    audio_chunks = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_chunks.extend(chunk["data"])
    return bytes(audio_chunks)


async def synthesize_speech(text: str) -> bytes:
    return await synthesize_speech_with_voice(text, "en-US-GuyNeural")


async def synthesize_podcast_dialogue(script: str) -> bytes:
    lines = [line.strip() for line in script.split("\n") if line.strip()]
    audio_parts: list[bytes] = []
    for line in lines:
        if line.lower().startswith("jane:"):
            audio_parts.append(
                await synthesize_speech_with_voice(line.split(":", 1)[1].strip(), "en-US-JennyNeural")
            )
        elif line.lower().startswith("adam:"):
            audio_parts.append(
                await synthesize_speech_with_voice(line.split(":", 1)[1].strip(), "en-US-GuyNeural")
            )
        else:
            audio_parts.append(await synthesize_speech_with_voice(line, "en-US-GuyNeural"))
    return b"".join(audio_parts)
