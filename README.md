# Paadal

Two tools in one app:
* **🎵 Song audio → lyrics** — upload or record a song in any language → lyrics in **Tamil letters** + **English transliteration**, with review, PDF / Word export.
* **📄 Tamil document → English** — upload a Tamil Word document (.docx) of bhajans/lyrics → download it in English letters (same layout, Tamil + English under each line, or two columns), or as PDF.

Both use the same word library (learned corrections + `public/words.csv`).

| Path | What it is |
|---|---|
| `public/index.html` | The app (don't edit by hand) |
| `public/words.csv` | Shared word library: `current_word,new_word,language` (`tamil` / `english` / `both`) |
| `netlify/functions/words.mjs` | Saves words the app learns from your corrections (Netlify Blobs) |
| `netlify/functions/songs.mjs` | Backs up **My songs** — lyrics (Tamil + English) and audio as compact MP3 (Netlify Blobs) |
| `netlify.toml` | Netlify settings |

## How updates work
* **Every push to `main` redeploys the site automatically** (about a minute).
* Edit `public/words.csv` right on GitHub (pencil icon → Commit) — the site updates by itself.
* Words learned from your corrections are saved to the site automatically and used on every device.
* Every song you use (file, recording, YouTube link, pasted lyrics) is kept in **📚 My songs** on the phone and backed up to the site.

## Optional: sync password
In Netlify → Site configuration → Environment variables, add `PAADAL_KEY` = any password,
then enter the same password in the app (Word library → Sync password). Without it, anyone who knows the
site address could add words.
