# Voxly

> Record your thoughts. Get structured notes instantly.

Voxly is an iOS voice notes app that converts recordings into clean, AI-structured notes. Speak freely — the app handles transcription, summarisation, key points, action items, and tags automatically.

**Built with:** React Native + Expo · FastAPI · Groq Whisper · LLaMA 3.3 · MongoDB Atlas · Supabase · Resend  
**Cost to run:** $0 (all free tiers)

---

## Features

- **Record** — Tap to record up to 5 minutes of audio, or upload an existing file
- **Transcribe** — Groq Whisper converts speech to text in seconds
- **Structure** — LLaMA 3.3 70B extracts a precise summary, key points, action items, and tags
- **Checkboxes** — Tick off action items and save progress back to the note
- **Search & Filter** — Full-text search and dynamic tag filters derived from your notes
- **Dark / Light mode** — Manual theme toggle persisted across sessions
- **Pull to refresh** — Swipe down on the notes list to fetch latest

### Structured Output Example

```json
{
  "title": "Q3 Roadmap Planning Session",
  "summary": "Rishabh and the team reviewed the Q3 roadmap. The API refactor deadline was moved to July 15 due to the new hire onboarding. No blockers were raised.",
  "key_points": [
    "API refactor deadline moved to July 15",
    "New hire starting Monday — needs onboarding access",
    "Design review scheduled for next week"
  ],
  "action_items": [
    "Rishabh — finish auth module by Friday",
    "Team — schedule design review for next week"
  ],
  "tags": ["meeting", "roadmap", "backend"]
}
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile | React Native + Expo SDK 54 |
| Routing | Expo Router 6 |
| Backend | FastAPI (Python 3.12) |
| Auth | Supabase (email OTP, backend-only) |
| Email | Resend (custom SMTP via Supabase) |
| Transcription | Groq Whisper (`whisper-large-v3`) |
| Summarisation | Groq LLaMA 3.3 70B Versatile |
| Database | MongoDB Atlas + Motor (async) |
| Containerisation | Docker + docker-compose |
| Hosting | Render (free tier) |

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker (for backend)
- [Expo Go](https://expo.dev/go) on your iPhone
- [Groq API key](https://console.groq.com) (free)
- [MongoDB Atlas](https://cloud.mongodb.com) connection string (free)
- [Supabase](https://supabase.com) project with email OTP configured
- [Resend](https://resend.com) account + verified domain (for email delivery)

See [docs/deployment.md](docs/deployment.md) for full setup instructions.

### 1. Clone & configure

```bash
git clone git@rishai:rishai-0913/voxly.git
cd Voxly
```

Create `backend/.env`:

```env
GROQ_API_KEY=gsk_your_key_here
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?appName=voxly
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...   # legacy service_role key from Supabase dashboard
APP_ENV=development
MAX_AUDIO_DURATION_SECONDS=300
```

Create `mobile/.env.local`:

```env
EXPO_PUBLIC_API_URL=http://YOUR_MAC_IP:8020
```

### 2. Run the backend

```bash
# With Docker (recommended)
docker compose up --build

# Without Docker
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8020
```

Backend runs at `http://localhost:8020`  
Auto-docs at `http://localhost:8020/docs`

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
Voxly/
├── backend/
│   ├── main.py                  # FastAPI routes
│   ├── services/
│   │   ├── transcriber.py       # Groq Whisper integration
│   │   ├── summariser.py        # LLaMA 3.3 structured extraction
│   │   └── audio.py             # File upload + cleanup
│   ├── db/mongo.py              # MongoDB CRUD via Motor
│   ├── requirements.txt
│   └── Dockerfile
├── mobile/
│   ├── app/
│   │   ├── index.tsx            # Splash screen + API health check
│   │   ├── home.tsx             # Notes feed with search & filters
│   │   ├── record.tsx           # Recording screen with waveform
│   │   ├── settings.tsx         # Profile, name, summary style, logout
│   │   ├── note/[id].tsx        # Note detail + checkbox save
│   │   └── auth/
│   │       ├── email.tsx        # Email input screen
│   │       └── otp.tsx          # 6-digit OTP verification
│   ├── components/
│   │   ├── Logo.tsx             # Animated bar logo
│   │   ├── Waveform.tsx         # Live waveform visualiser
│   │   ├── NoteCard.tsx         # Note list card
│   │   └── StructuredOutput.tsx # Summary / key points / action items
│   ├── contexts/
│   │   ├── auth.tsx             # Token + user stored in SecureStore
│   │   └── theme.tsx            # Dark/light theme context
│   ├── services/api.ts          # All backend API calls
│   └── types/index.ts           # Shared TypeScript types
├── .gitignore
└── docker-compose.yml
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | None | Health check |
| `POST` | `/auth/send-otp` | None | Send 6-digit OTP to email |
| `POST` | `/auth/verify-otp` | None | Verify OTP → returns tokens |
| `POST` | `/auth/refresh` | None | Refresh access token |
| `POST` | `/transcribe` | Bearer | Upload audio → structured note |
| `GET` | `/notes` | Bearer | List all notes |
| `GET` | `/notes/search?q=` | Bearer | Full-text search |
| `GET` | `/notes/{id}` | Bearer | Get a single note |
| `PATCH` | `/notes/{id}` | Bearer | Update note |
| `DELETE` | `/notes/{id}` | Bearer | Delete a note |
| `GET` | `/me` | Bearer | Get user profile |
| `PATCH` | `/me` | Bearer | Update name / summary style |
