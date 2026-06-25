# Voxly — Deployment Guide

---

## Architecture Overview

| Layer | Service |
|---|---|
| Auth | Supabase (email OTP) |
| User profiles | Supabase PostgreSQL |
| Notes | MongoDB Atlas |
| AI / Transcription | Groq (Whisper + LLaMA 3.3 70B) |
| Email delivery | Resend (custom SMTP via Supabase) |
| Backend API | FastAPI on Render |
| Mobile | Expo (React Native) |

---

## Auth Flow

```
Mobile → POST /auth/send-otp → Backend → Supabase (sends email via Resend)
Mobile → POST /auth/verify-otp → Backend → Supabase → returns access_token + refresh_token
Mobile stores tokens in SecureStore, sends as Authorization: Bearer on all requests
Backend validates token via _supabase.auth.get_user(token)
```

**Important:** The mobile app has zero Supabase credentials. All auth goes through the FastAPI backend.

---

## 1. Supabase Setup

### 1.1 Create project
1. Go to [supabase.com](https://supabase.com) → **New project**
2. Name: `voxly`, pick a region close to users
3. Set a database password and save it
4. Wait ~2 min for provisioning

### 1.2 Get the service role key (legacy format)
1. **Dashboard → Settings → API Keys**
2. Under **Legacy API Keys**, copy the `service_role` key — it starts with `eyJ...`
3. Do **not** use the new `sb_secret_...` format keys — `supabase-py 2.5.3` does not support them
4. Copy the **Project URL** (`https://xxxx.supabase.co`)

### 1.3 Configure Email Auth
1. **Authentication → Providers → Email** — enabled by default
2. **Authentication → Providers → Email** settings:
   - **Confirm email** → **OFF** (otherwise new users get a confirmation link instead of OTP)
   - **OTP length** → `6`
   - **OTP expiry** → `3600` (1 hour)

### 1.4 Configure Email Templates
1. **Authentication → Emails → Magic Link or OTP** template
2. Replace the body to show the OTP token:

```html
<h2>Your Voxly code</h2>
<p>Enter this code to sign in:</p>
<h1 style="letter-spacing: 8px; font-size: 48px;">{{ .Token }}</h1>
<p>This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
```

`{{ .Token }}` is the 6-digit code Supabase injects at send time.

### 1.5 Set up Resend SMTP
Supabase's built-in mailer is rate-limited (4 emails/hour on free tier). Use Resend for reliable delivery.

1. Create a free account at [resend.com](https://resend.com)
2. **Resend → API Keys** → create a key, copy it (`re_...`)
3. **Resend → Domains** → add your domain (e.g. `rishai.in`) and verify DNS records
4. **Supabase → Authentication → Emails → SMTP Settings**:
   - Enable Custom SMTP: **ON**
   - Sender email: `noreply@yourdomain.com`
   - Sender name: `Voxly`
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend` (always exactly `resend`, not your account name)
   - Password: your Resend API key (`re_...`)
   - Click **Save changes** — you must re-enter the password every time you save

### 1.6 Create profiles table
Run in **Supabase Dashboard → SQL Editor → New query**:

```sql
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text default '',
  summary_style text default 'concise',
  email text,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## 2. MongoDB Atlas Setup

### 2.1 Create cluster
1. [cloud.mongodb.com](https://cloud.mongodb.com) → free M0 cluster
2. Create a database user with a strong password
3. Get the connection string: `mongodb+srv://user:pass@cluster.mongodb.net/?appName=voxly`

### 2.2 Whitelist all IPs (required for Render)
1. **Network Access → Add IP Address**
2. Click **Allow Access from Anywhere** → `0.0.0.0/0`
3. Confirm

Render's IPs change dynamically so `0.0.0.0/0` is required on free tier.

---

## 3. Backend Setup

### 3.1 Environment variables
Create `backend/.env`:

```env
GROQ_API_KEY=gsk_your_key_here
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/?appName=voxly
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGci...   # legacy eyJ... service_role key
APP_ENV=development
MAX_AUDIO_DURATION_SECONDS=300
```

### 3.2 Run locally with Docker
```bash
docker compose up --build
```

Backend at `http://localhost:8020` · Docs at `http://localhost:8020/docs`

### 3.3 Deploy to Render
1. [render.com](https://render.com) → **New → Web Service** → connect GitHub repo
2. Settings:
   - **Runtime**: Docker
   - **Dockerfile path**: `./backend/Dockerfile`
   - **Docker context**: `./backend`
3. **Environment** — add these vars in Render dashboard:
   ```
   GROQ_API_KEY
   MONGODB_URI
   SUPABASE_URL
   SUPABASE_SERVICE_KEY
   APP_ENV=production
   MAX_AUDIO_DURATION_SECONDS=300
   ```
4. Click **Deploy**

**Verify:** `GET https://your-service.onrender.com/health` → `{"status": "ok"}`

> Render free tier spins down after 15 min of inactivity. First request after sleep takes ~30s.

---

## 4. Mobile Setup

### 4.1 Environment config
Create `mobile/.env`:
```env
EXPO_PUBLIC_API_URL=https://your-service.onrender.com
```

For local development, create `mobile/.env.local` (overrides `.env`):
```env
EXPO_PUBLIC_API_URL=http://YOUR_MAC_IP:8020
```

Find your Mac's local IP with: `ifconfig | grep "inet " | grep -v 127.0.0.1`

**The mobile app needs no Supabase credentials** — only the backend URL.

### 4.2 Run
```bash
cd mobile
npm install
npx expo start --clear
```

Scan the QR code with **Expo Go** on your iPhone. After any `.env` change, always restart with `--clear` and rescan the QR code (live reload does not pick up env changes).

---

## 5. API Reference

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

---

## 6. Mobile Distribution (Expo Go)

The app is distributed via **Expo Go** — no App Store required. Testers install Expo Go and open the app via QR code or link.

### Manual update
```bash
cd mobile
eas update --branch preview --message "description of change"
```

### Automatic update on push to `dev`
A GitHub Actions workflow (`.github/workflows/eas-update.yml`) publishes an EAS Update automatically on every push to the `dev` branch.

**Required GitHub secret:**
- `EXPO_TOKEN` — create at [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens), add to GitHub repo → Settings → Secrets → Actions

**Tester instructions:**
1. Install **Expo Go** from the App Store / Play Store
2. Open the QR from [expo.dev](https://expo.dev/accounts/rishai_0913/projects/voxly/updates) or the EAS dashboard
3. App updates automatically on next open after each `eas update`

**Future App Store deployment:**
- Android (Google Play): $25 one-time — run `eas build --platform android --profile production` then `eas submit --platform android`
- iOS (App Store): requires Apple Developer account ($99/year) — run `eas build --platform ios --profile production` then `eas submit --platform ios`

---

## 7. Pre-Launch Checklist

- [ ] Supabase project created with legacy `eyJ...` service role key
- [ ] Email auth: Confirm email OFF, OTP length 6
- [ ] Magic Link or OTP email template uses `{{ .Token }}`
- [ ] Resend domain verified, SMTP configured in Supabase (username must be `resend`)
- [ ] `profiles` table and trigger created
- [ ] MongoDB Atlas IP whitelist set to `0.0.0.0/0`
- [ ] Backend deployed to Render with all env vars
- [ ] `/health` endpoint returning OK
- [ ] Mobile `.env` pointing to Render URL
- [ ] Full OTP flow tested end-to-end on physical device
- [ ] Recording, transcription, and summary styles working

---

## 8. App Store Deployment (when ready)

```bash
npm install -g eas-cli
eas login
cd mobile

# Android (Google Play — $25 one-time)
eas build --platform android --profile production
eas submit --platform android

# iOS (App Store — requires $99/year Apple Developer account)
eas build --platform ios --profile production
eas submit --platform ios
```
