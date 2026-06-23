# Voxly — User Guide

Everything you need to know to get structured notes from your voice recordings.

---

## Getting Started

### Install the App

Voxly runs on your iPhone via **Expo Go** (no App Store required during beta).

1. Download [Expo Go](https://expo.dev/go) from the App Store
2. Ask the developer for the QR code or project link
3. Scan the QR code in Expo Go — the app loads instantly

> For the web demo, open the link on any browser — no installation needed.

### First Launch

On first launch, the app will ask for **microphone permission**. Tap **Allow** — this is required to record voice notes. Your audio is only used for transcription and is never stored on third-party servers beyond what's needed to process your note.

---

## Recording a Note

### Start Recording

1. Tap the large **record button** on the home screen
2. The button animates and a waveform appears — you're live
3. Speak naturally — no need to pause or enunciate slowly
4. Tap the button again (or the stop icon) to finish

> Maximum recording length is **5 minutes**. For longer content, break it into multiple notes.

### While Recording

- The waveform reacts to your voice in real time
- A timer shows elapsed recording time
- Tap the **bin icon** to cancel and discard without saving

### After Recording

Once you stop, the app automatically:

1. **Transcribes** your audio (Groq Whisper — usually under 10 seconds)
2. **Structures** the transcript with AI (LLaMA — another 5-10 seconds)
3. **Saves** the finished note to your feed

You'll see a progress indicator with the current step: `Recording → Transcribing → Summarising → Done`

---

## Uploading an Audio File

1. On the home screen, tap the **upload icon** (top right)
2. Select an audio file — supported formats: `.m4a`, `.mp3`, `.wav`
3. The same transcription + structuring pipeline runs automatically

> Files larger than 25 MB are split into chunks and processed in sequence — this may take slightly longer.

---

## Reading Your Notes

Each note card in the feed shows:

- **Summary** — 2-3 sentence overview at the top
- **Key Points** — bulleted highlights
- **Action Items** — tasks and to-dos extracted from the recording
- **Tags** — auto-assigned topic labels (e.g. `meeting`, `ideas`, `planning`)
- **Date & duration** of the original recording

Tap any card to open the **full detail view**, which also shows the raw transcript.

---

## Searching Notes

Tap the **search bar** at the top of the home screen and type any keyword.

- Searches across the full transcript, summary, and key points
- Filter by tag by tapping a tag chip on any note
- Filter by date using the date picker in the top-right menu

---

## Managing Notes

### Delete a Note

Swipe left on any note card → tap **Delete**. This removes the note permanently.

### Copy Output

In the note detail view:
- Tap **Copy Summary** to copy just the summary to your clipboard
- Tap **Copy All** to copy the full structured output (summary + key points + action items)

### Share a Note

Tap the **share icon** in the detail view to share via Messages, Notes, or any other app using the iOS share sheet.

---

## Tips for Better Notes

| Situation | Tip |
|-----------|-----|
| Meeting notes | State the meeting topic at the start: *"This is the Q3 planning meeting..."* |
| Quick ideas | Just speak freely — the AI extracts structure even from rambling |
| Lectures / talks | Pause briefly between major topics for cleaner key-point separation |
| Action items | Say names and deadlines clearly: *"Rishabh will finish this by Friday"* |
| Long recordings | Break into 3-5 minute chunks for faster processing |

---

## Troubleshooting

### "Transcription failed"

- Check your internet connection — transcription requires an active connection
- The Groq API has a free-tier rate limit (14,400 requests/day). If you hit it, wait until midnight UTC to reset
- Try recording again; transient network errors retry automatically

### Audio sounds clipped or quiet

- Hold the phone 15-20 cm from your mouth
- Avoid very loud environments — background noise won't break transcription but may reduce quality

### App not loading via Expo Go

- Make sure you're on the same Wi-Fi network as the development server, or use the tunnel mode QR code
- Try closing and reopening Expo Go

### Notes not syncing

- Notes are saved locally first and sync when connectivity is restored
- If a note shows a sync error badge, tap it to retry

---

## Privacy

- Audio files are sent to the **Groq API** for transcription and then discarded — Groq does not store audio
- Structured note data is saved to **MongoDB Atlas** (your own database instance)
- No data is shared with third parties beyond what's needed to process your note
