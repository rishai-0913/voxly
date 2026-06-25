from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import List

from db.mongo import (
    ensure_indexes,
    insert_note, list_notes, find_note, remove_note, search_notes, update_note,
    find_user_by_phone, find_user_by_id, create_user, update_user_password, update_user_profile,
)
from services.audio import save_upload, cleanup
from services.transcriber import transcribe
from services.summariser import structure
from services.auth import (
    send_otp, check_otp,
    hash_password, verify_password,
    create_token, decode_token,
)


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


_bearer = HTTPBearer()


def current_user(credentials: HTTPAuthorizationCredentials = Depends(_bearer)) -> dict:
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload  # {"sub": user_id, "phone": ...}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    user: dict = Depends(current_user),
):
    path, size = await save_upload(file)
    try:
        transcript, duration_secs = await transcribe(path, size)
        user_doc = await find_user_by_id(user["sub"])
        style = user_doc.get("summary_style", "concise") if user_doc else "concise"
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
        return note
    finally:
        cleanup(path)


@app.get("/notes")
async def get_notes(user: dict = Depends(current_user)):
    return await list_notes(user["sub"])


@app.get("/notes/search")
async def search(q: str, user: dict = Depends(current_user)):
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
    note = await update_note(note_id, user["sub"], body.model_dump())
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@app.delete("/notes/{note_id}", status_code=204)
async def delete_note(note_id: str, user: dict = Depends(current_user)):
    deleted = await remove_note(note_id, user["sub"])
    if not deleted:
        raise HTTPException(status_code=404, detail="Note not found")


# ── Auth ──────────────────────────────────────────────────────────────────────

class SendOtpRequest(BaseModel):
    phone: str


class VerifyOtpRequest(BaseModel):
    phone: str
    code: str


class LoginRequest(BaseModel):
    phone: str
    password: str


class RegisterRequest(BaseModel):
    phone: str
    password: str


@app.post("/auth/check-phone")
async def auth_check_phone(body: SendOtpRequest):
    user = await find_user_by_phone(body.phone)
    return {"exists": user is not None}


@app.post("/auth/send-otp", status_code=204)
async def auth_send_otp(body: SendOtpRequest):
    try:
        send_otp(body.phone)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not send OTP: {e}")


@app.post("/auth/verify-otp")
async def auth_verify_otp(body: VerifyOtpRequest):
    approved = check_otp(body.phone, body.code)
    if not approved:
        raise HTTPException(status_code=400, detail="Invalid or expired code")
    user = await find_user_by_phone(body.phone)
    return {"verified": True, "exists": user is not None}


@app.post("/auth/login")
async def auth_login(body: LoginRequest):
    user = await find_user_by_phone(body.phone)
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect phone or password")
    token = create_token(user["_id"], user["phone"])
    return {"token": token, "user": {"id": user["_id"], "phone": user["phone"]}}


@app.post("/auth/register", status_code=201)
async def auth_register(body: RegisterRequest):
    existing = await find_user_by_phone(body.phone)
    if existing:
        raise HTTPException(status_code=409, detail="Account already exists")
    hashed = hash_password(body.password)
    user = await create_user(body.phone, hashed)
    token = create_token(user["_id"], user["phone"])
    return {"token": token, "user": {"id": user["_id"], "phone": user["phone"]}}


class ProfileUpdate(BaseModel):
    name: str | None = None
    summary_style: str | None = None


VALID_STYLES = {"concise", "detailed", "action_focused"}


@app.get("/me")
async def get_me(user: dict = Depends(current_user)):
    doc = await find_user_by_id(user["sub"])
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": doc["_id"],
        "phone": doc["phone"],
        "name": doc.get("name", ""),
        "summary_style": doc.get("summary_style", "concise"),
    }


@app.patch("/me")
async def update_me(body: ProfileUpdate, user: dict = Depends(current_user)):
    data = body.model_dump(exclude_none=True)
    if "summary_style" in data and data["summary_style"] not in VALID_STYLES:
        raise HTTPException(status_code=400, detail=f"summary_style must be one of {VALID_STYLES}")
    updated = await update_user_profile(user["sub"], data)
    return {
        "id": updated["_id"],
        "phone": updated["phone"],
        "name": updated.get("name", ""),
        "summary_style": updated.get("summary_style", "concise"),
    }


class ResetPasswordRequest(BaseModel):
    phone: str
    password: str


@app.post("/auth/reset-password")
async def auth_reset_password(body: ResetPasswordRequest):
    user = await find_user_by_phone(body.phone)
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")
    hashed = hash_password(body.password)
    updated = await update_user_password(body.phone, hashed)
    token = create_token(updated["_id"], updated["phone"])
    return {"token": token, "user": {"id": updated["_id"], "phone": updated["phone"]}}
