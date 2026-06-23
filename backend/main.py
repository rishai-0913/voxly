from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import List

from db.mongo import ensure_indexes, insert_note, list_notes, find_note, remove_note, search_notes, update_note
from services.audio import save_upload, cleanup
from services.transcriber import transcribe
from services.summariser import structure


@asynccontextmanager
async def lifespan(app: FastAPI):
    await ensure_indexes()
    yield


app = FastAPI(title="Voxly", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    path, size = await save_upload(file)
    try:
        transcript, duration_secs = await transcribe(path, size)
        structured = await structure(transcript)

        note = await insert_note({
            **structured,
            "transcript": transcript,
            "duration_seconds": duration_secs,
            "word_count": len(transcript.split()),
        })
        return note
    finally:
        cleanup(path)


@app.get("/notes")
async def get_notes():
    return await list_notes()


@app.get("/notes/search")
async def search(q: str):
    if not q.strip():
        return []
    return await search_notes(q)


@app.get("/notes/{note_id}")
async def get_note(note_id: str):
    note = await find_note(note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


class NoteUpdate(BaseModel):
    completed_items: List[int]


@app.patch("/notes/{note_id}")
async def patch_note(note_id: str, body: NoteUpdate):
    note = await update_note(note_id, body.model_dump())
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@app.delete("/notes/{note_id}", status_code=204)
async def delete_note(note_id: str):
    deleted = await remove_note(note_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Note not found")
