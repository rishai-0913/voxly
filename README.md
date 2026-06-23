# Voxly

> Record your thoughts. Get structured notes instantly.

Voxly is an iOS app that converts voice recordings into clean, structured notes using AI. Speak freely — the app handles transcription, summarisation, key points, and action items automatically.

**Built with:** React Native + Expo · FastAPI · Groq Whisper · LLaMA 3.1 · MongoDB Atlas  
**Cost to run:** $0 (all free tiers)

---

## What It Does

1. **Record** — Tap to record up to 5 minutes of audio, or upload an existing file
2. **Transcribe** — Groq Whisper converts your speech to text in seconds
3. **Structure** — LLaMA 3.1 extracts a summary, key points, action items, and tags
4. **Save & Search** — All notes are saved and fully searchable by content or tag

### Structured Output Example

```json
{
  "summary": "Discussed Q3 roadmap and assigned backend tasks.",
  "key_points": [
    "API refactor deadline moved to July 15",
    "New hire starting Monday"
  ],
  "action_items": [
    "Finish auth module by Friday",
    "Schedule design review next week"
  ],
  "tags": ["meeting", "roadmap", "backend"]
}
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native + Expo |
| Styling | NativeWind (Tailwind for RN) |
| Backend | FastAPI (Python) |
| Transcription | Groq Whisper (`whisper-large-v3`) |
| Summarisation | Groq LLaMA 3.1 70B |
| Database | MongoDB Atlas |
| Backend Deploy | Railway |
| App Demo | Expo Go / Expo Web → Vercel |

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Docker (optional, for backend)
- [Expo Go](https://expo.dev/go) on your iPhone
- [Groq API key](https://console.groq.com) (free)
- [MongoDB Atlas](https://cloud.mongodb.com) connection string (free)

### 1. Clone & configure

```bash
git clone https://github.com/your-username/voicenote-ai
cd Voxly
```

Create `backend/.env`:

```env
GROQ_API_KEY=gsk_your_key_here
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/voxly
APP_ENV=development
MAX_AUDIO_DURATION_SECONDS=300
```

### 2. Run the backend

```bash
# With Docker
docker compose up --build

# Without Docker
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`

### 3. Run the mobile app

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your iPhone.

---

## Project Structure

```
voicenote-ai/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── services/
│   │   ├── transcriber.py       # Groq Whisper integration
│   │   ├── summariser.py        # LLaMA structuring
│   │   └── audio.py             # File handling + chunking
│   ├── models/schemas.py        # Pydantic models
│   ├── db/mongo.py              # MongoDB connection
│   └── Dockerfile
├── mobile/
│   ├── app/
│   │   ├── index.tsx            # Notes feed (home)
│   │   ├── record.tsx           # Recording screen
│   │   └── note/[id].tsx        # Note detail
│   ├── components/
│   │   ├── RecordButton.tsx
│   │   ├── Waveform.tsx
│   │   ├── NoteCard.tsx
│   │   └── StructuredOutput.tsx
│   └── services/api.ts          # Backend API calls
└── docker-compose.yml
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/transcribe` | Upload audio → transcription + structured notes |
| `GET` | `/notes` | List all saved notes |
| `GET` | `/notes/{id}` | Get a single note |
| `DELETE` | `/notes/{id}` | Delete a note |
| `GET` | `/notes/search?q=` | Full-text search |

Full API docs available at `http://localhost:8000/docs` (FastAPI auto-docs).

---

## Deployment

**Backend → Railway**

1. Push repo to GitHub
2. Create new Railway project → link repo → select `backend/`
3. Add environment variables in Railway dashboard
4. Railway auto-deploys on push

**Web Demo → Vercel**

```bash
cd mobile
npx expo export --platform web
# Deploy the dist/ folder to Vercel
```

---

## Documentation

- [User Guide](docs/user-guide.md) — how to use the app
- [Project Plan](docs/project-4-voicenote-ai.md) — original spec and build estimates
