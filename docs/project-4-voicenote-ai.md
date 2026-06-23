# VoiceNote AI — Voice to Structured Notes

## Overview

An iOS app that records voice notes and instantly converts them into structured, actionable text using AI. Powered by Groq Whisper for transcription and LLaMA for summarisation — turning raw speech into clean summaries, key points, and action items in seconds.

**Target users:** Professionals, students, meeting attendees, anyone who thinks faster than they type  
**Core value:** Stop typing notes — speak freely and get a clean, structured summary automatically

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile Frontend | React Native + Expo |
| Styling | NativeWind (Tailwind for React Native) |
| Backend | FastAPI (Python) |
| Speech-to-Text | Groq Whisper API (free) |
| Summarisation + NLP | Groq LLaMA 3.1 70B (free) |
| Database | MongoDB Atlas (free tier) |
| Backend Deploy | Railway (free tier) |
| App Demo | Expo Go (QR code) + Expo Web → Vercel |

> **Cost: $0** — Groq free tier + MongoDB Atlas free + Railway free + Expo Go

---

## API Keys Setup

### 1. Groq API Key (Whisper + LLaMA — free)

1. Go to `console.groq.com`
2. Sign up → **API Keys** → **Create API Key**
3. Copy key (starts with `gsk_...`)

```env
GROQ_API_KEY=gsk_your_key_here
```

**Free tier:** 14,400 req/day, no credit card required  
**Models used:**
- `whisper-large-v3` — transcription
- `llama-3.1-70b-versatile` — summarisation

---

### 2. MongoDB Atlas (Database — free)

1. Go to `cloud.mongodb.com` → create free account
2. Create a cluster → select **M0 Free Tier**
3. Create database user → whitelist IP `0.0.0.0/0`
4. Get connection string

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/voicenote
```

---

### 3. Environment File

`backend/.env`:
```env
GROQ_API_KEY=gsk_your_key_here
MONGODB_URI=mongodb+srv://your_connection_string
APP_ENV=development
MAX_AUDIO_DURATION_SECONDS=300
```

`backend/.env.example` (commit this):
```env
GROQ_API_KEY=your_groq_api_key_here
MONGODB_URI=your_mongodb_connection_string
APP_ENV=development
MAX_AUDIO_DURATION_SECONDS=300
```

---

## Features

### Core
- Record voice notes directly in the app (up to 5 minutes)
- Upload existing audio files (m4a, mp3, wav)
- Auto transcription via Groq Whisper
- AI-generated structured output:
  - TL;DR summary (2-3 sentences)
  - Key points (bullet list)
  - Action items (tasks extracted)
  - Topics/tags (auto-labelled)
- Save and browse all notes
- Search notes by content or tag
- Copy or share structured output

### UI/UX
- Clean dark-mode interface
- Animated recording waveform
- Real-time transcription progress indicator
- Card-based notes feed
- Swipe to delete
- Filter by tag or date

### Technical
- Audio chunking for files over 25MB
- Retry logic on Groq API failures
- Offline note storage with sync on reconnect
- Notes stored in MongoDB with full text search index
- Processing status: recording → transcribing → summarising → done

---

## Project Structure

```
voicenote-ai/
├── backend/
│   ├── main.py                  # FastAPI app
│   ├── services/
│   │   ├── transcriber.py       # Groq Whisper integration
│   │   ├── summariser.py        # LLaMA summarisation + structuring
│   │   └── audio.py             # Audio file handling + chunking
│   ├── models/
│   │   └── schemas.py           # Pydantic models
│   ├── db/
│   │   └── mongo.py             # MongoDB connection + queries
│   ├── requirements.txt
│   ├── .env
│   ├── .env.example
│   └── Dockerfile
├── mobile/
│   ├── app/
│   │   ├── index.tsx            # Home — notes feed
│   │   ├── record.tsx           # Recording screen
│   │   └── note/[id].tsx        # Note detail screen
│   ├── components/
│   │   ├── RecordButton.tsx
│   │   ├── Waveform.tsx
│   │   ├── NoteCard.tsx
│   │   └── StructuredOutput.tsx
│   ├── services/
│   │   └── api.ts               # Backend API calls
│   ├── app.json
│   ├── package.json
│   └── tailwind.config.js
└── docker-compose.yml
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/transcribe` | Upload audio, receive transcription + structured notes |
| GET | `/notes` | List all saved notes |
| GET | `/notes/{id}` | Get a single note |
| DELETE | `/notes/{id}` | Delete a note |
| GET | `/notes/search?q=` | Full text search across notes |

---

## LLM Output Schema

```json
{
  "summary": "Discussed Q3 roadmap and assigned tasks for the backend team.",
  "key_points": [
    "API refactor deadline moved to July 15",
    "New hire starting next Monday"
  ],
  "action_items": [
    "Rishabh to finish auth module by Friday",
    "Schedule design review for next week"
  ],
  "tags": ["meeting", "roadmap", "backend"]
}
```

---

## Deployment

```bash
# Local backend
docker compose up --build
# Backend: localhost:8000

# Mobile — run on iPhone
npx expo start
# Scan QR code with Expo Go app
```

**Production:**
- Backend → Railway (add env vars in Railway dashboard)
- Web demo → `npx expo export --platform web` → Vercel

---

## Estimated Build Time

| Phase | Time |
|-------|------|
| Groq Whisper + LLaMA integration | 1 day |
| FastAPI backend + MongoDB | 0.5 day |
| React Native recording screen | 1 day |
| Notes feed + detail screen | 0.5 day |
| Integration + testing | 0.5 day |
| Expo Go setup + deployment | 0.5 day |
| **Total** | **~4 days** |

---

## Portfolio Value

- Whisper + LLM pipeline is impressive in live demo
- Audio → structured text is a real, marketable product
- Covers: Groq, FastAPI, React Native, Expo, MongoDB
- Zero cost to keep live — strong portfolio demo
