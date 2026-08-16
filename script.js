// ============================================================
//  Heer Memsahab — playlist-driven music player
//
//  The YouTube playlist below is the single source of truth.
//  Add a song to the playlist on YouTube and it appears here
//  automatically — nothing in this file needs to change.
// ============================================================

const PLAYLIST_ID = "PLWy_M1Gs9zY8";
const SITE_ORIGIN = "https://rohangoenka6.github.io";

// ---------- Elements ----------
const els = {
  songTitle: document.getElementById("songTitle"),
  songArtist: document.getElementById("songArtist"),
  songNote: document.getElementById("songNote"),
  songCover: document.getElementById("songCover"),
  playBtn: document.getElementById("playBtn"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  back10Btn: document.getElementById("back10Btn"),
  fwd10Btn: document.getElementById("fwd10Btn"),
  progressBar: document.getElementById("progressBar"),
  curTime: document.getElementById("curTime"),
  durTime: document.getElementById("durTime"),
  volBtn: document.getElementById("volBtn"),
  volumePopover: document.getElementById("volumePopover"),
  volumeSlider: document.getElementById("volumeSlider"),
  listBtn: document.getElementById("listBtn"),
  listPanel: document.getElementById("listPanel"),
  listCloseBtn: document.getElementById("listCloseBtn"),
  listItems: document.getElementById("listItems"),
  listEmpty: document.getElementById("listEmpty"),
};

// ---------- State ----------
let player = null;
let playerReady = false;
let isPlaying = false;
let isDraggingProgress = false;
let playlistIds = []; // video IDs in playlist order
const videoInfoCache = {}; // videoId -> { title, artist }
let hasPlayedOnce = false; // true once any video successfully starts playing
let recoveryIndex = 0; // which start index we're currently trying
const MAX_RECOVERY_ATTEMPTS = 40; // safety net against an all-blocked playlist

// ============================================================
// YouTube IFrame API
// ============================================================
function onYouTubeIframeAPIReady() {
  player = new YT.Player("ytPlayer", {
    playerVars: {
      autoplay: 0,
      controls: 0,
      rel: 0,
      fs: 0,
      iv_load_policy: 3,
      playsinline: 1,
      enablejsapi: 1,
      origin: SITE_ORIGIN,
      listType: "playlist",
      list: PLAYLIST_ID,
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError,
    },
  });
}
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

function onPlayerReady() {
  playerReady = true;

  const iframe = player.getIframe ? player.getIframe() : null;
  if (iframe) {
    iframe.setAttribute(
      "allow",
      "autoplay; encrypted-media; picture-in-picture; fullscreen"
    );
    iframe.setAttribute("playsinline", "1");
  }

  player.setVolume(Number(els.volumeSlider.value));

  els.songTitle.textContent = "Loading playlist\u2026";
  els.songArtist.textContent = "";
  waitForPlaylist(0);
}

// The playlist's video list isn't always available the instant the
// player fires "ready" — poll briefly until it shows up.
function waitForPlaylist(attempt) {
  const list = player.getPlaylist ? player.getPlaylist() : null;
  if (list && list.length) {
    playlistIds = list;
    els.songTitle.textContent = "Ready to play";
    els.songArtist.textContent = "Tap play to begin";
    buildListPanel();
    return;
  }
  if (attempt < 30) {
    setTimeout(() => waitForPlaylist(attempt + 1), 400);
  } else {
    els.songTitle.textContent = "Couldn't load playlist";
    els.songArtist.textContent = "";
    els.listEmpty.textContent =
      "Playlist not found \u2014 check it's Public/Unlisted, not Private.";
  }
}

function onPlayerError(e) {
  const code = e.data;
  const isEmbedBlocked = code === 100 || code === 101 || code === 150;

  // Log which exact video failed, so it's easy to identify on YouTube.
  try {
    const failedId = playlistIds[recoveryIndex] || (player.getVideoData && player.getVideoData().video_id);
    console.warn(
      "[Heer Memsahab player] video failed (code " + code + "):",
      failedId,
      "https://youtube.com/watch?v=" + failedId
    );
  } catch (err) {
    /* ignore */
  }

  if (!isEmbedBlocked) {
    els.songNote.textContent = "\u26a0\ufe0f Playback error (code " + code + ")";
    return;
  }

  if (!hasPlayedOnce) {
    // Nothing has played yet, so the playlist object may not be fully
    // initialized — a plain nextVideo() can't be trusted here. Instead,
    // hard re-cue the whole playlist starting one video further along.
    recoveryIndex++;
    if (recoveryIndex >= MAX_RECOVERY_ATTEMPTS) {
      els.songTitle.textContent = "Couldn't find a playable song";
      els.songArtist.textContent = "";
      els.songNote.textContent =
        "\u26a0\ufe0f Many songs at the start of the playlist can't be embedded \u2014 check the console log, or remove/reorder them on YouTube.";
      return;
    }
    els.songNote.textContent = "\u26a0\ufe0f Skipping a song that can't play here\u2026";
    try {
      player.loadPlaylist({
        listType: "playlist",
        list: PLAYLIST_ID,
        index: recoveryIndex,
      });
    } catch (err) {
      /* ignore */
    }
    return;
  }

  // A song failed mid-listening, after playback has already worked at
  // least once — the playlist object is healthy, so a normal skip works.
  els.songNote.textContent = "\u26a0\ufe0f Skipping a song that can't play here\u2026";
  setTimeout(() => {
    try {
      player.nextVideo();
      player.playVideo();
    } catch (err) {
      /* ignore */
    }
  }, 350);
}

function onPlayerStateChange(e) {
  if (e.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    hasPlayedOnce = true;
    setPlayBtn(true);
    updateNowPlaying();
    highlightActiveListItem();
  } else if (
    e.data === YT.PlayerState.PAUSED ||
    e.data === YT.PlayerState.CUED
  ) {
    isPlaying = false;
    setPlayBtn(false);
    if (e.data === YT.PlayerState.CUED) {
      updateNowPlaying();
      highlightActiveListItem();
    }
  } else if (e.data === YT.PlayerState.ENDED) {
    player.nextVideo();
  }
}

function setPlayBtn(playing) {
  els.playBtn.textContent = playing ? "\u23f8" : "\u25b6";
}

// ============================================================
// Now-playing display
// ============================================================
function updateNowPlaying() {
  try {
    const d = player.getVideoData();
    if (d && d.title) {
      els.songTitle.textContent = d.title;
      els.songArtist.textContent = d.author || "";
    }
    if (d && d.video_id) {
      els.songCover.src = "https://i.ytimg.com/vi/" + d.video_id + "/mqdefault.jpg";
      els.songCover.alt = d.title || "Song cover";
    }
    els.songNote.textContent = "For you, always \u2764\ufe0f";
  } catch (err) {
    /* player not ready yet */
  }
}

// ============================================================
// Playback controls
// ============================================================
function togglePlay() {
  if (!playerReady) return;
  if (isPlaying) {
    player.pauseVideo();
  } else {
    player.playVideo();
  }
}

function seekBy(seconds) {
  if (!playerReady) return;
  try {
    const current = player.getCurrentTime();
    const duration = player.getDuration();
    player.seekTo(Math.max(0, Math.min(duration, current + seconds)), true);
  } catch (err) {
    /* ignore */
  }
}

els.playBtn.addEventListener("click", togglePlay);
els.prevBtn.addEventListener("click", () => playerReady && player.previousVideo());
els.nextBtn.addEventListener("click", () => playerReady && player.nextVideo());
els.back10Btn.addEventListener("click", () => seekBy(-10));
els.fwd10Btn.addEventListener("click", () => seekBy(10));

// ============================================================
// Progress bar
// ============================================================
function formatTime(seconds) {
  seconds = Math.floor(Number(seconds) || 0);
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return m + ":" + s;
}

els.progressBar.addEventListener("pointerdown", () => {
  isDraggingProgress = true;
});

els.progressBar.addEventListener("input", () => {
  els.curTime.textContent = formatTime(els.progressBar.value);
});

els.progressBar.addEventListener("change", () => {
  if (playerReady) {
    try {
      player.seekTo(Number(els.progressBar.value), true);
    } catch (err) {
      /* ignore */
    }
  }
  isDraggingProgress = false;
});

function pollProgress() {
  if (!playerReady || isDraggingProgress) return;
  try {
    const current = player.getCurrentTime();
    const duration = player.getDuration();
    if (duration > 0) {
      els.progressBar.max = duration;
      els.progressBar.value = current;
      els.curTime.textContent = formatTime(current);
      els.durTime.textContent = formatTime(duration);
    }
  } catch (err) {
    /* ignore */
  }
}
setInterval(pollProgress, 500);

// ============================================================
// Volume
// ============================================================
function volumeIcon(v) {
  if (v <= 0) return "\ud83d\udd07";
  if (v < 50) return "\ud83d\udd09";
  return "\ud83d\udd0a";
}

els.volBtn.addEventListener("click", (ev) => {
  ev.stopPropagation();
  els.volumePopover.hidden = !els.volumePopover.hidden;
});

document.addEventListener("click", (ev) => {
  if (
    !els.volumePopover.hidden &&
    !els.volumePopover.contains(ev.target) &&
    ev.target !== els.volBtn
  ) {
    els.volumePopover.hidden = true;
  }
});

els.volumeSlider.addEventListener("input", () => {
  const v = Number(els.volumeSlider.value);
  els.volBtn.textContent = volumeIcon(v);
  if (playerReady) {
    try {
      player.setVolume(v);
      if (v === 0) player.mute();
      else player.unMute();
    } catch (err) {
      /* ignore */
    }
  }
});

// ============================================================
// Song list panel
// ============================================================
function buildListPanel() {
  els.listItems.innerHTML = "";

  playlistIds.forEach((videoId, index) => {
    const item = document.createElement("button");
    item.className = "list-item";
    item.dataset.index = String(index);

    const idxEl = document.createElement("span");
    idxEl.className = "list-item-index";
    idxEl.textContent = String(index + 1);

    const thumb = document.createElement("img");
    thumb.className = "list-item-thumb";
    thumb.src = "https://i.ytimg.com/vi/" + videoId + "/default.jpg";
    thumb.alt = "";

    const text = document.createElement("div");
    text.className = "list-item-text";

    const titleEl = document.createElement("div");
    titleEl.className = "list-item-title";
    titleEl.textContent = "Loading\u2026";

    const artistEl = document.createElement("div");
    artistEl.className = "list-item-artist";
    artistEl.textContent = "";

    text.append(titleEl, artistEl);

    const playingMark = document.createElement("span");
    playingMark.className = "list-item-playing";
    playingMark.textContent = "\u266a";
    playingMark.style.display = "none";

    item.append(idxEl, thumb, text, playingMark);

    item.addEventListener("click", () => {
      if (!playerReady) return;
      player.playVideoAt(index);
      player.playVideo();
      closeListPanel();
    });

    els.listItems.appendChild(item);

    fetchVideoInfo(videoId).then((info) => {
      titleEl.textContent = info.title;
      artistEl.textContent = info.artist;
    });
  });
}

function fetchVideoInfo(videoId) {
  if (videoInfoCache[videoId]) {
    return Promise.resolve(videoInfoCache[videoId]);
  }
  const url =
    "https://www.youtube.com/oembed?url=" +
    encodeURIComponent("https://www.youtube.com/watch?v=" + videoId) +
    "&format=json";

  return fetch(url)
    .then((res) => res.json())
    .then((data) => {
      const info = {
        title: data.title || "Untitled song",
        artist: data.author_name || "",
      };
      videoInfoCache[videoId] = info;
      return info;
    })
    .catch(() => {
      const info = { title: "Untitled song", artist: "" };
      videoInfoCache[videoId] = info;
      return info;
    });
}

function highlightActiveListItem() {
  if (!playerReady) return;
  let idx;
  try {
    idx = player.getPlaylistIndex();
  } catch (err) {
    return;
  }
  if (idx == null || idx < 0) return;

  const items = els.listItems.querySelectorAll(".list-item");
  items.forEach((item) => {
    const active = Number(item.dataset.index) === idx;
    item.classList.toggle("active", active);
    const mark = item.querySelector(".list-item-playing");
    if (mark) mark.style.display = active ? "inline" : "none";
  });
}

function openListPanel() {
  els.listPanel.hidden = false;
  highlightActiveListItem();
}
function closeListPanel() {
  els.listPanel.hidden = true;
}

els.listBtn.addEventListener("click", (ev) => {
  ev.stopPropagation();
  if (els.listPanel.hidden) openListPanel();
  else closeListPanel();
});
els.listCloseBtn.addEventListener("click", closeListPanel);

// ============================================================
// Clock
// ============================================================
function startClock() {
  const timeEl = document.getElementById("clockTime");
  const ampmEl = document.getElementById("clockAmPm");
  const dateEl = document.getElementById("clockDate");
  const tick = () => {
    const now = new Date();
    let h = now.getHours();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    const mm = String(now.getMinutes()).padStart(2, "0");
    timeEl.textContent = h + ":" + mm;
    ampmEl.textContent = ampm;
    dateEl.textContent = now.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };
  tick();
  setInterval(tick, 1000);
}

// ============================================================
// Weather
// ============================================================
function wmoEmoji(code) {
  if (code === 0) return "\u2600\ufe0f";
  if (code <= 2) return "\u26c5";
  if (code === 3 || code === 45 || code === 48) return "\u2601\ufe0f";
  if (code <= 67) return "\ud83c\udf27\ufe0f";
  if (code <= 77) return "\ud83c\udf28\ufe0f";
  if (code <= 82) return "\ud83c\udf26\ufe0f";
  if (code <= 86) return "\ud83c\udf28\ufe0f";
  return "\u26c8\ufe0f";
}

async function fetchWeather(lat, lon, el) {
  try {
    const wRes = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=" +
        lat +
        "&longitude=" +
        lon +
        "&current=temperature_2m,weather_code"
    );
    if (!wRes.ok) throw new Error("weather request failed");
    const data = await wRes.json();
    const temp = Math.round(data.current.temperature_2m);
    el.textContent = wmoEmoji(data.current.weather_code) + " " + temp + "\u00b0";
  } catch (err) {
    el.textContent = "\ud83c\udf19";
  }
}

function initWeather() {
  const el = document.getElementById("weatherTxt");
  fetchWeather(18.5204, 73.8567, el); // Pune, Maharashtra
}

// ============================================================
// Background artwork
// ============================================================
function checkBackground() {
  const candidates = ["background.png", "background.jpg"];
  let i = 0;
  const tryNext = () => {
    if (i >= candidates.length) return;
    const img = new Image();
    img.onload = () => document.body.classList.add("has-bg");
    img.onerror = tryNext;
    img.src = candidates[i++];
  };
  tryNext();
}

// ============================================================
// Boot
// ============================================================
checkBackground();
startClock();
initWeather();
