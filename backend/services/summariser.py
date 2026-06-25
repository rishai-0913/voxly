import os
import json
from groq import AsyncGroq

BASE_PROMPT = """You are an expert note-taker and analyst. Given a raw voice transcript, extract and return a JSON object with these fields:

- title: a precise, specific title that names the actual topic discussed (5-8 words). Avoid generic titles like "Meeting Notes" — reflect what was actually said.
- summary: covers WHO discussed WHAT, the core decisions or conclusions reached, and any important context. Be specific — name people, products, dates, and numbers when present. No filler phrases like "the team discussed".
- key_points: an array of precise, self-contained bullet strings. Each bullet must be a complete, factual statement (not a topic label). Use specific numbers, names, and outcomes.
- action_items: an array of concrete, actionable tasks. Format: "Owner — task description [deadline if mentioned]". If no owner is mentioned write "Team". Extract ANY task, to-do, or thing that needs to be done — even if phrased as a topic or description. Be liberal: if something sounds like work that needs doing, make it an action item.
- tags: array of 2-5 lowercase topic tags that precisely categorise the content (e.g. "backend", "authentication", "sprint-planning").

Rules:
- Do not invent information not present in the transcript
- If a field has no relevant content, return an empty array
- Return ONLY valid JSON, no markdown, no explanation"""

STYLE_INSTRUCTIONS = {
    "concise": "Style: Be concise and to-the-point. Summary: 2-3 sentences max. Key points: 3-5 tight bullets. Cut anything that isn't essential.",
    "detailed": "Style: Be thorough and detailed. Summary: 4-6 sentences covering full context. Key points: 6-10 comprehensive bullets. Include nuance and supporting context.",
    "action_focused": "Style: Prioritise action items above all. Summary: 1-2 sentences only. Key points: focus on decisions and outcomes only. Action items: extract every possible task, be exhaustive — aim for 5+ items if the content supports it.",
}


def build_prompt(style: str) -> str:
    instruction = STYLE_INSTRUCTIONS.get(style, STYLE_INSTRUCTIONS["concise"])
    return f"{BASE_PROMPT}\n\n{instruction}"


async def structure(transcript: str, summary_style: str = "concise") -> dict:
    client = AsyncGroq(api_key=os.environ["GROQ_API_KEY"])

    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": build_prompt(summary_style)},
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
