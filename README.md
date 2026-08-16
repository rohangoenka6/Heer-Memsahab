# ❤️ Heer Memsahab — a music player for her

A beautiful little website that plays songs straight from a single YouTube
playlist. The **YouTube playlist is the source of truth**: add a song there and
it automatically appears on the website. No code editing, no `songs.js`, no
"day of the week" logic.

- Live site: https://rohangoenka6.github.io/Heer-Memsahab/
- GitHub repo: https://github.com/rohangoenka6/Heer-Memsahab
- YouTube playlist: https://www.youtube.com/watch?v=LUgpPmj6nR8&list=PLWy_M1Gs9zY8 (Unlisted)

## What's in this folder

| File             | What it is                                                        |
| ---------------- | ----------------------------------------------------------------- |
| `index.html`     | The page itself (don't need to touch this)                        |
| `styles.css`     | The look & feel (don't need to touch this)                        |
| `script.js`      | The player brain (don't need to touch this)                       |
| `background.png` | Your background artwork (replace this file to change the scene)   |
| `README.md`      | This guide                                                        |

If `background.png` is missing, the site shows a hand-drawn night scene
(moon, skyline, couple silhouette) so it still looks good.

## What the site does

- Bottom player bar with play/pause, previous / next
- Drag-able progress bar with current / total time
- +10 / −10 second skip buttons
- Volume control
- **☰ list button** → opens the song list (thumbnails + titles from YouTube)
- Tap any song in the list to play it
- Clock and weather (Pune) in the top corner

## Adding a new song (takes 30 seconds)

1. Open your YouTube playlist (the link above).
2. Add the song the way you normally add anything to a playlist.
3. Done — the song shows up on the website automatically.

That's it. You never touch the code.

## Deploying changes (only when the code files change)

The current files are already live. If you edit a code file, upload the changed
files back to the repo:

1. Go to https://github.com/rohangoenka6/Heer-Memsahab
2. Click **Add file → Upload files**.
3. Drag in `index.html`, `styles.css`, `script.js` (and `background.png` if you
   changed it), overwriting the existing ones.
4. Click **Commit changes**. The site updates in a minute or two.

> `songs.js` is no longer used and can be deleted from the repo if it's still there.

## Changing the background artwork

1. Export a night-scene image from Canva as **PNG** (1920×1080 works best).
2. Name it exactly `background.png` and replace the one in this folder.
3. Upload it to the repo (see above).

Everything is ₹0 — YouTube, GitHub Pages, SSL, hosting. Forever.
