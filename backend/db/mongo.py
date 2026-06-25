from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime, timezone
import os

_client: AsyncIOMotorClient | None = None


def get_db():
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(os.environ["MONGODB_URI"])
    return _client["voxly"]


def notes_col():
    return get_db()["notes"]


def _serialize(doc: dict) -> dict:
    doc["_id"] = str(doc["_id"])
    return doc


async def insert_note(data: dict, user_id: str) -> dict:
    data["created_at"] = datetime.now(timezone.utc)
    data["status"] = "done"
    data["user_id"] = user_id
    result = await notes_col().insert_one(data)
    doc = await notes_col().find_one({"_id": result.inserted_id})
    return _serialize(doc)


async def list_notes(user_id: str) -> list[dict]:
    cursor = notes_col().find({"user_id": user_id}).sort("created_at", -1)
    return [_serialize(d) async for d in cursor]


async def find_note(note_id: str, user_id: str) -> dict | None:
    doc = await notes_col().find_one({"_id": ObjectId(note_id), "user_id": user_id})
    return _serialize(doc) if doc else None


async def update_note(note_id: str, user_id: str, data: dict) -> dict | None:
    await notes_col().update_one({"_id": ObjectId(note_id), "user_id": user_id}, {"$set": data})
    return await find_note(note_id, user_id)


async def remove_note(note_id: str, user_id: str) -> bool:
    result = await notes_col().delete_one({"_id": ObjectId(note_id), "user_id": user_id})
    return result.deleted_count == 1


async def search_notes(query: str, user_id: str) -> list[dict]:
    cursor = notes_col().find(
        {"$text": {"$search": query}, "user_id": user_id},
        {"score": {"$meta": "textScore"}},
    ).sort([("score", {"$meta": "textScore"})]).limit(20)
    return [_serialize(d) async for d in cursor]


async def ensure_indexes():
    await notes_col().create_index(
        [("title", "text"), ("summary", "text"), ("transcript", "text")],
        name="full_text_search",
    )
