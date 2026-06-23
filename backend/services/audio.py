import os
import tempfile
import math
from fastapi import UploadFile

MAX_CHUNK_BYTES = 24 * 1024 * 1024  # 25 MB Groq limit with a margin


async def save_upload(file: UploadFile) -> tuple[str, int]:
    """Save upload to a temp file. Returns (path, size_bytes)."""
    suffix = os.path.splitext(file.filename or "audio.m4a")[1] or ".m4a"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
        content = await file.read()
        f.write(content)
        return f.name, len(content)


def needs_chunking(size_bytes: int) -> bool:
    return size_bytes > MAX_CHUNK_BYTES


def split_audio(path: str, size_bytes: int) -> list[str]:
    """
    Split audio into <=25 MB chunks using ffmpeg.
    Returns list of chunk file paths.
    """
    import subprocess

    num_chunks = math.ceil(size_bytes / MAX_CHUNK_BYTES)
    chunk_dir = tempfile.mkdtemp()
    pattern = os.path.join(chunk_dir, "chunk_%03d.m4a")

    # Get duration
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True
    )
    duration = float(result.stdout.strip())
    chunk_duration = math.ceil(duration / num_chunks)

    subprocess.run(
        ["ffmpeg", "-i", path, "-f", "segment", "-segment_time", str(chunk_duration),
         "-c", "copy", "-reset_timestamps", "1", pattern],
        check=True, capture_output=True,
    )

    return sorted(
        [os.path.join(chunk_dir, f) for f in os.listdir(chunk_dir) if f.endswith(".m4a")]
    )


def cleanup(*paths: str):
    for p in paths:
        try:
            os.unlink(p)
        except OSError:
            pass
