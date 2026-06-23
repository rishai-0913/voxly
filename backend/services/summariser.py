import os
import json
from groq import AsyncGroq

SYSTEM_PROMPT = """You are an expert note-taker and analyst. Given a raw voice transcript, extract and return a JSON object with these fields:

- title: a precise, specific title that names the actual topic discussed (5-8 words). Avoid generic titles like "Meeting Notes" — reflect what was actually said.
- summary: a tight 3-4 sentence paragraph that covers WHO discussed WHAT, the core decisions or conclusions reached, and any important context. Be specific — name people, products, dates, and numbers when present. No filler phrases like "the team discussed".
- key_points: an array of 4-8 precise, self-contained bullet strings. Each bullet must be a complete, factual statement (not a topic label). Use specific numbers, names, and outcomes. Example: "Auth service will use JWT with 7-day refresh tokens" not "Auth was discussed".
- action_items: an array of concrete, actionable tasks. Format: "Owner — task description [deadline if mentioned]". If no owner is mentioned write "Team". Include only real commitments, not vague intentions. Example: "Rishabh — integrate Stripe billing endpoint by Friday".
- tags: array of 2-5 lowercase topic tags that precisely categorise the content (e.g. "backend", "authentication", "sprint-planning").

Rules:
- Be precise and specific — extract actual facts, numbers, names, and decisions from the transcript
- Do not invent information not present in the transcript
- If a field has no relevant content (e.g. no action items), return an empty array
- Return ONLY valid JSON, no markdown, no explanation"""


async def structure(transcript: str) -> dict:
    client = AsyncGroq(api_key=os.environ["GROQ_API_KEY"])

    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Transcript:\n\n{transcript}"},
        ],
        temperature=0.2,
        max_tokens=2048,
        response_format={"type": "json_object"},
    )

    raw = response.choices[0].message.content
    data = json.loads(raw)

    return {
        "title": data.get("title", "Untitled Note"),
        "summary": data.get("summary", ""),
        "key_points": data.get("key_points", []),
        "action_items": data.get("action_items", []),
        "tags": [t.lower() for t in data.get("tags", [])],
    }
