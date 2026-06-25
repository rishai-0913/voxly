from dotenv import load_dotenv
load_dotenv()

import os
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import List, Optional
from supabase import create_client, Client

from db.mongo import (
    ensure_indexes,
    insert_note, list_notes, find_note, remove_note, search_notes, update_note,
)
from services.audio import save_upload, cleanup
from services.transcriber import transcribe
from services.summariser import structure

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
log = logging.getLogger("voxly")

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]

log.info("Connecting to Supabase: %s", SUPABASE_URL)
_supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("Starting up — ensuring MongoDB indexes")
    await ensure_indexes()
    log.info("Startup complete")
    yield
    log.info("Shutting down")


app = FastAPI(title="Voxly", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_bearer = HTTPBearer()

VALID_STYLES = {"concise", "detailed", "action_focused"}


def current_user(credentials: HTTPAuthorizationCredentials = Depends(_bearer)) -> dict:
    try:
        response = _supabase.auth.get_user(credentials.credentials)
        user = response.user
        if not user:
            log.warning("get_user returned no user")
            raise HTTPException(status_code=401, detail="Invalid token")
        log.debug("Authenticated user: %s", user.id)
        return {"sub": user.id, "email": user.email}
    except HTTPException:
        raise
    except Exception as e:
        log.warning("Token validation failed: %s", e)
        raise HTTPException(status_code=401, detail="Invalid token")


def get_profile(user_id: str) -> dict:
    res = _supabase.table("profiles").select("*").eq("id", user_id).single().execute()
    return res.data or {}


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok"}


# ── Auth ──────────────────────────────────────────────────────────────────────

class SendOtpRequest(BaseModel):
    email: str


class VerifyOtpRequest(BaseModel):
    email: str
    code: str


class RefreshRequest(BaseModel):
    refresh_token: str


@app.post("/auth/send-otp", status_code=204)
async def auth_send_otp(body: SendOtpRequest):
    log.info("send-otp request for email: %s", body.email)
    try:
        _supabase.auth.sign_in_with_otp({"email": body.email})
        log.info("OTP sent successfully to: %s", body.email)
    except Exception as e:
        log.error("Failed to send OTP to %s: %s", body.email, e, exc_info=True)
        raise HTTPException(status_code=502, detail=f"Could not send OTP: {e}")


@app.post("/auth/verify-otp")
async def auth_verify_otp(body: VerifyOtpRequest):
    log.info("verify-otp request for email: %s", body.email)
    try:
        result = _supabase.auth.verify_otp({"email": body.email, "token": body.code, "type": "email"})
        if not result.session:
            log.warning("verify_otp returned no session for %s", body.email)
            raise HTTPException(status_code=400, detail="Invalid or expired code")
        log.info("OTP verified, user logged in: %s", result.user.id)
        return {
            "access_token": result.session.access_token,
            "refresh_token": result.session.refresh_token,
            "user": {"id": result.user.id, "email": result.user.email},
        }
    except HTTPException:
        raise
    except Exception as e:
        log.error("OTP verification failed for %s: %s", body.email, e, exc_info=True)
        raise HTTPException(status_code=400, detail="Invalid or expired code")


@app.post("/auth/refresh")
async def auth_refresh(body: RefreshRequest):
    log.info("Token refresh request")
    try:
        result = _supabase.auth.refresh_session(body.refresh_token)
        if not result.session:
            raise HTTPException(status_code=401, detail="Session expired")
        log.info("Session refreshed successfully")
        return {
            "access_token": result.session.access_token,
            "refresh_token": result.session.refresh_token,
        }
    except HTTPException:
        raise
    except Exception as e:
        log.error("Token refresh failed: %s", e, exc_info=True)
        raise HTTPException(status_code=401, detail="Session expired")


# ── Transcribe ────────────────────────────────────────────────────────────────

@app.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    user: dict = Depends(current_user),
):
    log.info("Transcribe request from user: %s, file: %s", user["sub"], file.filename)
    path, size = await save_upload(file)
    try:
        transcript, duration_secs = await transcribe(path, size)
        log.info("Transcription done — %d words, %.1fs", len(transcript.split()), duration_secs)
        profile = get_profile(user["sub"])
        style = profile.get("summary_style", "concise")
        if style not in VALID_STYLES:
            style = "concise"
        log.info("Structuring with style: %s", style)
        structured = await structure(transcript, summary_style=style)
        note = await insert_note(
            {
                **structured,
                "transcript": transcript,
                "duration_seconds": duration_secs,
                "word_count": len(transcript.split()),
            },
            user_id=user["sub"],
        )
        log.info("Note saved: %s", note.get("_id"))
        return note
    finally:
        cleanup(path)


# ── Notes ─────────────────────────────────────────────────────────────────────

@app.get("/notes")
async def get_notes(user: dict = Depends(current_user)):
    log.info("List notes for user: %s", user["sub"])
    return await list_notes(user["sub"])


@app.get("/notes/search")
async def search(q: str, user: dict = Depends(current_user)):
    log.info("Search notes for user %s: %r", user["sub"], q)
    if not q.strip():
        return []
    return await search_notes(q, user["sub"])


@app.get("/notes/{note_id}")
async def get_note(note_id: str, user: dict = Depends(current_user)):
    note = await find_note(note_id, user["sub"])
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


class NoteUpdate(BaseModel):
    completed_items: List[int]


@app.patch("/notes/{note_id}")
async def patch_note(note_id: str, body: NoteUpdate, user: dict = Depends(current_user)):
    log.info("Patch note %s for user %s", note_id, user["sub"])
    note = await update_note(note_id, user["sub"], body.model_dump())
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@app.delete("/notes/{note_id}", status_code=204)
async def delete_note(note_id: str, user: dict = Depends(current_user)):
    log.info("Delete note %s for user %s", note_id, user["sub"])
    deleted = await remove_note(note_id, user["sub"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Note not found")


# ── Profile ───────────────────────────────────────────────────────────────────

@app.get("/me")
async def get_me(user: dict = Depends(current_user)):
    log.info("Get profile for user: %s", user["sub"])
    profile = get_profile(user["sub"])
    return {
        "id": user["sub"],
        "email": user.get("email", ""),
        "name": profile.get("name", ""),
        "summary_style": profile.get("summary_style", "concise"),
    }


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    summary_style: Optional[str] = None


@app.patch("/me")
async def update_me(body: ProfileUpdate, user: dict = Depends(current_user)):
    data = body.model_dump(exclude_none=True)
    log.info("Update profile for user %s: %s", user["sub"], data)
    if "summary_style" in data and data["summary_style"] not in VALID_STYLES:
        raise HTTPException(status_code=400, detail=f"summary_style must be one of {VALID_STYLES}")
    _supabase.table("profiles").update(data).eq("id", user["sub"]).execute()
    profile = get_profile(user["sub"])
    return {
        "id": user["sub"],
        "email": user.get("email", ""),
        "name": profile.get("name", ""),
        "summary_style": profile.get("summary_style", "concise"),
    }
