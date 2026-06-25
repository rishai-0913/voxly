# Voxly — Deployment Guide

Three independent deployments: **Backend** (FastAPI on Railway), **iOS** (App Store via EAS), **Android** (Play Store via EAS).

---

## Overview

| Target | Tool | Cost | Time |
|--------|------|------|------|
| Backend | Railway | Free tier / ~$5/mo | 15 min |
| iOS App Store | EAS Build + Submit | Free EAS + $99/yr Apple Developer | 2–4 hrs (first time) |
| Android Play Store | EAS Build + Submit | Free EAS + $25 one-time | 1–2 hrs (first time) |

**Easiest path:** Deploy backend first → test on device → then submit to stores.

---

## Part 1 — Backend (FastAPI on Railway)

### Prerequisites
- GitHub account with the Voxly repo pushed
- [Railway account](https://railway.app) (free)
- MongoDB Atlas cluster already running

### Steps

**1. Push backend to GitHub** (if not already done)
```bash
git add . && git commit -m "deploy: add backend"
git push origin main
```

**2. Create Railway project**
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select your `voxly` repo
3. Railway auto-detects the `Dockerfile` in `backend/` — set **Root Directory** to `backend`

**3. Add environment variables** in Railway dashboard → Variables:
```
GROQ_API_KEY=gsk_your_key_here
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/voxly
```

**4. Set the port**
Railway auto-assigns a port via `$PORT`. Update `backend/main.py` startup or add:
```
PORT=8020
```

Or update the Dockerfile `CMD`:
```dockerfile
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "${PORT:-8020}"]
```

**5. Deploy**
Railway deploys automatically on every push to `main`. Your backend URL will be something like:
```
https://voxly-backend-production.up.railway.app
```

**6. Update mobile API URL**
In `mobile/.env`:
```env
EXPO_PUBLIC_API_URL=https://voxly-backend-production.up.railway.app
```

**Verify:** Visit `https://your-url.railway.app/health` → should return `{"status": "ok"}`

---

## Part 2 — iOS App Store

### Prerequisites
- Mac with Xcode installed (Xcode 15+)
- [Apple Developer Account](https://developer.apple.com) — $99/year
- App created in [App Store Connect](https://appstoreconnect.apple.com)

### One-time setup

**1. Install EAS CLI**
```bash
npm install -g eas-cli
eas login
```

**2. Configure EAS in the project**
```bash
cd mobile
eas build:configure
```
This creates `eas.json` — accept defaults.

**3. Update `mobile/app.json`**
```json
{
  "expo": {
    "name": "Voxly",
    "slug": "voxly",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourname.voxly",
      "buildNumber": "1"
    }
  }
}
```
> `bundleIdentifier` must match exactly what you create in App Store Connect.

**4. Create app in App Store Connect**
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. My Apps → + → New App
3. Platform: iOS, Name: Voxly, Bundle ID: `com.yourname.voxly`
4. Fill in description, screenshots (you can use simulator screenshots), category: Productivity

### Build & Submit

**Build for App Store:**
```bash
cd mobile
eas build --platform ios --profile production
```
EAS handles certificates and provisioning profiles automatically. Build takes ~10-15 min in the cloud.

**Submit to App Store:**
```bash
eas submit --platform ios
```
EAS uploads the `.ipa` directly to App Store Connect.

**Then in App Store Connect:**
1. Go to your app → TestFlight (to test) or Pricing & Availability → Submit for Review
2. Apple review takes 1–3 days

---

## Part 3 — Android Play Store

### Prerequisites
- [Google Play Developer Account](https://play.google.com/console) — $25 one-time fee
- App created in Play Console

### One-time setup

**1. Update `mobile/app.json`**
```json
{
  "expo": {
    "android": {
      "package": "com.yourname.voxly",
      "versionCode": 1
    }
  }
}
```

**2. Create app in Play Console**
1. Go to [play.google.com/console](https://play.google.com/console) → Create app
2. App name: Voxly, Default language: English, App/Game: App, Free/Paid
3. Fill in store listing — description, screenshots, content rating

### Build & Submit

**Build for Play Store:**
```bash
cd mobile
eas build --platform android --profile production
```
Generates a signed `.aab` (Android App Bundle). EAS manages the keystore automatically — **download and back up your keystore** from the EAS dashboard.

**Submit to Play Store:**
```bash
eas submit --platform android
```
> First submission must be done manually in Play Console (upload the `.aab` yourself). After that, `eas submit` can handle it automatically.

**In Play Console:**
1. Upload the `.aab` under Release → Production (or Internal Testing first)
2. Complete the content rating questionnaire
3. Set pricing (free)
4. Submit for review — Android review takes a few hours to 3 days

---

## `eas.json` Reference

After running `eas build:configure`, your `mobile/eas.json` should look like:

```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

---

## Update & Re-release Workflow

**Backend:** Push to `main` → Railway auto-deploys.

**Mobile (new version):**
1. Bump `version` in `app.json` + `buildNumber` (iOS) / `versionCode` (Android)
2. `eas build --platform all --profile production`
3. `eas submit --platform all`

---

## Checklist Before Submitting to Stores

- [ ] Backend deployed and `/health` returning OK
- [ ] `EXPO_PUBLIC_API_URL` set to production backend URL in `.env`
- [ ] App icon set in `app.json` (1024×1024 PNG, no alpha)
- [ ] Splash screen configured
- [ ] Privacy policy URL ready (required by both stores)
- [ ] Screenshots prepared (iPhone 6.7" + 6.5" for iOS, phone + tablet for Android)
- [ ] App description written
- [ ] Content rating completed (Android)
- [ ] TestFlight / Internal Testing done before production release
