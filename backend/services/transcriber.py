import os
from groq import AsyncGroq

_client: AsyncGroq | None = None


def get_client() -> AsyncGroq:
    global _client
    if _client is None:
        _client = AsyncGroq(api_key=os.environ["GROQ_API_KEY"])
    return _client


async def transcribe_file(path: str) -> str:
    """Transcribe a single audio file using Groq Whisper."""
    client = get_client()
    with open(path, "rb") as f:
        response = await client.audio.transcriptions.create(
            file=(os.path.basename(path), f),
            model="whisper-large-v3",
            response_format="text",
            language="en",
        )
    return response if isinstance(response, str) else response.text


async def transcribe(path: str, size_bytes: int) -> tuple[str, int]:
    """
    Transcribe audio, chunking if needed.
    Returns (transcript, duration_seconds).
    """
    from .audio import needs_chunking, split_audio, cleanup

    if needs_chunking(size_bytes):
        chunks = split_audio(path, size_bytes)
        parts = []
        for chunk in chunks:
            text = await transcribe_file(chunk)
            parts.append(text)
            cleanup(chunk)
        transcript = " ".join(parts)
    else:
        transcript = await transcribe_file(path)

    # estimate duration from word count (avg 130 wpm)
    word_count = len(transcript.split())
    duration_secs = max(1, round(word_count / 130 * 60))
    return transcript, duration_secs
