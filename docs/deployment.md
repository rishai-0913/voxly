# Voxly — Deployment Guide

---

## Architecture Overview

| Layer | Service |
|---|---|
| Auth | Supabase (email OTP — no Twilio needed) |
| User profiles | Supabase PostgreSQL |
| Notes | MongoDB Atlas |
| AI / Transcription | Groq (LLaMA 3.3 70B) |
| Backend API | FastAPI on Render |
| Mobile | Expo (React Native) |

---

## Auth Flow

```
Enter email → Supabase sends 6-digit OTP to email → Verify code → Logged in
```

All users go through the same flow — no passwords, no phone numbers, no Twilio.

---

## 1. Supabase Setup

### 1.1 Create project
1. Go to [supabase.com](https://supabase.com) → **New project**
2. Name: `voxly`, pick a region close to users (e.g. `ap-south-1` for India)
3. Set a database password and save it
4. Wait ~2 min for provisioning

### 1.2 Enable Email OTP
1. **Authentication → Providers → Email** — enabled by default
2. **Authentication → Email Templates** — optionally customise the OTP email
3. **Authentication → Settings**:
   - Make sure **Enable email confirmations** is ON
   - Set **OTP expiry** (default 1 hour is fine)
   - Optionally set **Rate limits** for OTP emails

> Supabase's free tier includes 3,000 auth emails/month. No external email provider needed.

### 1.3 Create profiles table
Run in **Supabase Dashboard → SQL Editor → New query**:

```sql
-- User profiles linked to auth users
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text default '',
  summary_style text default 'concise',
  email text,
  updated_at timestamptz default now()
);

-- Enable row-level security
alter table public.profiles enable row level security;

-- Policies
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile row when a user signs up
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

### 1.4 Get your keys
**Supabase Dashboard → Settings → API**:

| Key | Where used |
|---|---|
| Project URL | Mobile `.env` → `EXPO_PUBLIC_SUPABASE_URL` |
| `anon` public key | Mobile `.env` → `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| JWT Secret | Backend `.env` → `SUPABASE_JWT_SECRET` (under **JWT Settings** section) |

---

## 2. MongoDB Atlas Setup

### 2.1 Whitelist all IPs (required for Render)
1. MongoDB Atlas → **Network Access** → **Add IP Address**
2. Click **Allow Access from Anywhere** → `0.0.0.0/0`
3. Save

Notes collection stays in MongoDB, keyed by Supabase user UUID.

---

## 3. Backend (Render) Setup

### 3.1 Connect repo to Render
1. [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Runtime**: Docker
   - **Dockerfile path**: `./backend/Dockerfile`
   - **Docker context**: `./backend`

### 3.2 Environment variables
Set these in Render dashboard → **Environment**:

```
GROQ_API_KEY=<your groq key>
MONGODB_URI=<your atlas URI>
SUPABASE_JWT_SECRET=<from supabase settings → api → jwt settings>
APP_ENV=production
MAX_AUDIO_DURATION_SECONDS=300
```

> Twilio vars are no longer needed — Supabase handles all auth.

### 3.3 Deploy
Hit **Deploy**. Build takes ~2 min. You'll get a URL like:
`https://voxly-backend.onrender.com`

**Verify:** `GET https://voxly-backend.onrender.com/health` → `{"status": "ok"}`

---

## 4. Mobile App Setup

### 4.1 Install Supabase
```bash
cd mobile
npx expo install @supabase/supabase-js react-native-url-polyfill
```

### 4.2 Environment config
Create `mobile/.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_API_URL=https://voxly-backend.onrender.com
```

---

## 5. Code Migration Summary

### Backend
- Remove `services/auth.py`
- Remove auth endpoints: `check-phone`, `send-otp`, `verify-otp`, `login`, `register`, `reset-password`
- Remove user functions from `db/mongo.py`: `create_user`, `get_user_by_phone`, `update_user_profile`
- Update `current_user` dependency → verify Supabase JWT with `PyJWT`
- Add `supabase-py` for profile reads/writes (or use direct DB queries)
- Remove from `requirements.txt`: `twilio`, `python-jose`, `passlib[bcrypt]`, `bcrypt`

### Mobile
- Add `lib/supabase.ts` — Supabase client
- Update `contexts/auth.tsx` — use Supabase session
- Replace `auth/phone.tsx` → `auth/email.tsx` — email input, calls `supabase.auth.signInWithOtp({ email })`
- Update `auth/otp.tsx` — calls `supabase.auth.verifyOtp({ email, token, type: 'email' })`
- Delete `auth/login.tsx` and `auth/set-password.tsx`
- Update `services/api.ts` — remove custom auth functions, read token from Supabase session

---

## 6. App Store Deployment

### Prerequisites
- Apple Developer Account ($99/yr) for iOS
- Google Play Developer Account ($25 one-time) for Android
- EAS CLI: `npm install -g eas-cli && eas login`

### iOS
```bash
cd mobile
eas build --platform ios --profile production
eas submit --platform ios
```

### Android
```bash
cd mobile
eas build --platform android --profile production
eas submit --platform android
```

---

## 7. Pre-Launch Checklist

- [ ] Supabase project created, email auth enabled
- [ ] `profiles` table and trigger created via SQL editor
- [ ] MongoDB Atlas IP whitelist set to `0.0.0.0/0`
- [ ] Backend deployed to Render, `/health` returning OK
- [ ] All env vars set in Render dashboard
- [ ] Mobile `.env` has Supabase URL, anon key, and backend URL
- [ ] Test OTP flow end-to-end with real email on physical iPhone
- [ ] Test note recording, transcription, and summary styles
- [ ] App icon + splash screen set in `app.json`
- [ ] Privacy policy URL ready (required by both stores)
- [ ] TestFlight / Internal Testing done before production release
