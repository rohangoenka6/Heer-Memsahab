// ============================================================
//  Heer Memsahab — playlist-driven music player
//
//  The YouTube playlist below is the single source of truth.
//  Add a song to the playlist on YouTube and it appears here
//  automatically — nothing in this file needs to change.
// ============================================================

const PLAYLIST_ID = "PLM5gSMwj4EUM";
const START_VIDEO_ID = "SESYUUrwtzc"; // fallback if the playlist is slow to load

// ============================================================
// Elements
// ============================================================
const els = {
  songTitle: document.getElementById("songTitle"),
  songArtist: document.getElementById("songArtist"),
  songNote: document.getElementById("songNote"),
  songCover: document.getElementById("songCover"),
  playBtn: document.getElementById("playBtn"),
  playIco: document.getElementById("playIco"),
  pauseIco: document.getElementById("pauseIco"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
  back10Btn: document.getElementById("back10Btn"),
  fwd10Btn: document.getElementById("fwd10Btn"),
  progressBar: document.getElementById("progressBar"),
  curTime: document.getElementById("curTime"),
  durTime: document.getElementById("durTime"),
  volBtn: document.getElementById("volBtn"),
  volLabel: document.getElementById("volLabel"),
  volumePopover: document.getElementById("volumePopover"),
  volumeSlider: document.getElementById("volumeSlider"),
  listBtn: document.getElementById("listBtn"),
  listCount: document.getElementById("listCount"),
  listPanel: document.getElementById("listPanel"),
  listCloseBtn: document.getElementById("listCloseBtn"),
  listItems: document.getElementById("listItems"),
  listEmpty: document.getElementById("listEmpty"),
};

// ============================================================
// State
// ============================================================
let player = null;
let playerReady = false;
let isPlaying = false;
let isDraggingProgress = false;
let playWhenReady = false; // user hit play before the player finished loading
let playlistResolved = false; // true once we have a song list to work with
let playlistIds = []; // video IDs in playlist order
let currentIndex = -1; // index of the song currently selected in the player
const videoInfoCache = {}; // videoId -> { title, artist }

// The player only talks to the exact origin that created it.
// On GitHub Pages this is automatic; the constant is a safe fallback.
function pageOrigin() {
  try {
    const o = window.location.origin;
    if (o && o !== "null" && /^https?:\/\//.test(o)) return o;
  } catch (err) {
    /* ignore */
  }
  return "https://rohangoenka6.github.io";
}

// ============================================================
// YouTube IFrame API
// ============================================================
function onYouTubeIframeAPIReady() {
  // NOTE: we deliberately do NOT pass listType/list here. Loading the
  // playlist inside playerVars hits a known YouTube bug where the
  // playlist fails on first load and getPlaylist() comes back empty.
  // Instead we cue the playlist after the player is ready (see below).
  player = new YT.Player("ytPlayer", {
    playerVars: {
      autoplay: 0,
      controls: 0,
      rel: 0,
      fs: 0,
      iv_load_policy: 3,
      playsinline: 1,
      enablejsapi: 1,
      origin: pageOrigin(),
    },
    events: {
      onReady: onPlayerReady,
      onStateChange: onPlayerStateChange,
      onError: onPlayerError,
    },
  });
}
window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

// Safety net: if the API script ever fails to load, inject it again.
setTimeout(function () {
  if (!window.YT || !YT.Player) {
    var s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(s);
  }
}, 4000);

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

  try {
    player.setVolume(Number(els.volumeSlider.value));
  } catch (err) {
    /* ignore */
  }

  setTitle("Loading your playlist\u2026", "");

  // Cue the playlist now that the player is ready. This is the reliable
  // way to get the full video list back from getPlaylist().
  try {
    player.cuePlaylist({
      listType: "playlist",
      list: PLAYLIST_ID,
      index: 0,
    });
  } catch (err) {
    /* ignore */
  }

  waitForPlaylist(0);
}

// Poll briefly until the playlist's video list shows up.
function waitForPlaylist(attempt) {
  const ids = safeGetPlaylist();
  if (ids.length) {
    onPlaylistReady(ids);
    return;
  }
  if (attempt >= 60) {
    // ~30 seconds: give up on the list but still offer the first song.
    playlistFallback();
    return;
  }
  setTimeout(function () {
    waitForPlaylist(attempt + 1);
  }, 500);
}

function safeGetPlaylist() {
  try {
    const list = player.getPlaylist();
    if (list && list.length) return list.slice();
  } catch (err) {
    /* ignore */
  }
  return [];
}

function onPlaylistReady(ids) {
  if (playlistResolved) return;
  playlistResolved = true;
  playlistIds = ids.slice();
  if (els.listCount) els.listCount.textContent = String(ids.length);
  buildListPanel();
  setTitle("Ready to play", "Tap \u25b6 to begin");
  maybeAutoPlay();
}

function playlistFallback() {
  if (playlistResolved) return;
  playlistResolved = true;
  playlistIds = [START_VIDEO_ID];
  buildListPanel();
  try {
    player.cueVideoById(START_VIDEO_ID);
  } catch (err) {
    /* ignore */
  }
  setTitle("Playlist is still loading", "Tap \u25b6 to play");
  els.songNote.textContent =
    "YouTube is still preparing the playlist \u2014 you can still play this first song.";
}

// ============================================================
// Player events
// ============================================================
function onPlayerStateChange(e) {
  const state = e.data;

  if (state === YT.PlayerState.CUED) {
    isPlaying = false;
    setPlayBtn(false);
    syncIndex();
    updateNowPlaying();
    if (!playlistResolved) {
      const ids = safeGetPlaylist();
      if (ids.length) onPlaylistReady(ids);
    }
    maybeAutoPlay();
    return;
  }

  if (state === YT.PlayerState.PLAYING) {
    isPlaying = true;
    setPlayBtn(true);
    syncIndex();
    updateNowPlaying();
    highlightActiveListItem();
    if (!playlistResolved) {
      const ids = safeGetPlaylist();
      if (ids.length) onPlaylistReady(ids);
    }
    return;
  }

  if (state === YT.PlayerState.PAUSED) {
    isPlaying = false;
    setPlayBtn(false);
    syncIndex();
    return;
  }

  if (state === YT.PlayerState.ENDED) {
    isPlaying = false;
    next();
  }
}

function onPlayerError(e) {
  const code = e.data;
  const blocked = code === 100 || code === 101 || code === 150;
  try {
    const failedId = player.getVideoData ? player.getVideoData().video_id : "";
    console.warn(
      "[Heer Memsahab player] video error (code " +
        code +
        "): https://youtube.com/watch?v=" +
        failedId
    );
  } catch (err) {
    /* ignore */
  }
  if (blocked) {
    // Song can't be embedded — skip past it so the next one plays.
    els.songNote.textContent =
      "\u26a0\ufe0f Skipping a song that can't play here\u2026";
    setTimeout(function () {
      try {
        next();
      } catch (err) {
        /* ignore */
      }
    }, 400);
  } else {
    els.songNote.textContent = "\u26a0\ufe0f Playback error (code " + code + ")";
  }
}

// Keep currentIndex in sync with whatever the player is actually on.
function syncIndex() {
  try {
    const i = player.getPlaylistIndex();
    if (Number.isFinite(i) && i >= 0) currentIndex = i;
  } catch (err) {
    /* ignore */
  }
}

// If the user tapped play before the player was ready, start once it is.
function maybeAutoPlay() {
  if (!playWhenReady) return;
  playWhenReady = false;
  try {
    player.playVideo();
  } catch (err) {
    /* ignore */
  }
}

function setPlayBtn(playing) {
  if (els.playIco) els.playIco.hidden = playing;
  if (els.pauseIco) els.pauseIco.hidden = !playing;
}

function setTitle(title, artist) {
  els.songTitle.textContent = title;
  els.songArtist.textContent = artist || "";
}

// ============================================================
// Now-playing display
// ============================================================
function updateNowPlaying() {
  if (!playerReady) return;
  try {
    const d = player.getVideoData();
    if (d && d.title) {
      els.songTitle.textContent = d.title;
      els.songArtist.textContent = d.author || "";
    }
    if (d && d.video_id) {
      els.songCover.src =
        "https://i.ytimg.com/vi/" + d.video_id + "/mqdefault.jpg";
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
function playAt(index) {
  if (!playerReady || !playlistIds.length) return;
  currentIndex = index;
  try {
    player.playVideoAt(index);
    player.playVideo();
  } catch (err) {
    try {
      player.loadVideoById(playlistIds[index]);
    } catch (err2) {
      /* ignore */
    }
  }
  highlightActiveListItem();
}

function next() {
  if (!playerReady) return;
  if (playlistIds.length) {
    const index =
      currentIndex < 0 ? 0 : (currentIndex + 1) % playlistIds.length;
    playAt(index);
  } else {
    try {
      player.nextVideo();
    } catch (err) {
      /* ignore */
    }
  }
}

function prev() {
  if (!playerReady) return;
  if (playlistIds.length) {
    const index =
      currentIndex <= 0 ? playlistIds.length - 1 : currentIndex - 1;
    playAt(index);
  } else {
    try {
      player.previousVideo();
    } catch (err) {
      /* ignore */
    }
  }
}

function togglePlay() {
  if (!playerReady) {
    playWhenReady = true;
    els.songNote.textContent = "Getting ready\u2026";
    return;
  }
  if (isPlaying) {
    player.pauseVideo();
  } else {
    try {
      player.playVideo();
    } catch (err) {
      /* ignore */
    }
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
els.prevBtn.addEventListener("click", prev);
els.nextBtn.addEventListener("click", next);
els.back10Btn.addEventListener("click", function () {
  seekBy(-10);
});
els.fwd10Btn.addEventListener("click", function () {
  seekBy(10);
});

// ============================================================
// Progress bar
// ============================================================
function formatTime(seconds) {
  seconds = Math.floor(Number(seconds) || 0);
  const m = Math.floor(seconds / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return m + ":" + s;
}

els.progressBar.addEventListener("pointerdown", function () {
  isDraggingProgress = true;
});

els.progressBar.addEventListener("input", function () {
  const v = Number(els.progressBar.value);
  const max = Number(els.progressBar.max) || 100;
  els.curTime.textContent = formatTime(v);
  els.progressBar.style.setProperty("--range-pct", (max > 0 ? (v / max) * 100 : 0) + "%");
});

els.progressBar.addEventListener("change", function () {
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
      els.progressBar.style.setProperty(
        "--range-pct",
        (current / duration) * 100 + "%"
      );
      els.curTime.textContent = formatTime(current);
      els.durTime.textContent = formatTime(duration);
    }
  } catch (err) {
    /* ignore */
  }
}
setInterval(pollProgress, 250);

// ============================================================
// Volume
// ============================================================
els.volBtn.addEventListener("click", function (ev) {
  ev.stopPropagation();
  els.volumePopover.hidden = !els.volumePopover.hidden;
});

document.addEventListener("click", function (ev) {
  if (
    !els.volumePopover.hidden &&
    !els.volumePopover.contains(ev.target) &&
    ev.target !== els.volBtn
  ) {
    els.volumePopover.hidden = true;
  }
});

els.volumeSlider.addEventListener("input", function () {
  const v = Number(els.volumeSlider.value);
  if (els.volLabel) els.volLabel.textContent = String(v);
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

  if (!playlistIds.length) {
    els.listEmpty.textContent = "No songs found yet.";
    els.listItems.appendChild(els.listEmpty);
    return;
  }

  playlistIds.forEach(function (videoId, index) {
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
    thumb.loading = "lazy";

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

    item.addEventListener("click", function () {
      playAt(index);
      closeListPanel();
    });

    els.listItems.appendChild(item);

    fetchVideoInfo(videoId).then(function (info) {
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
    .then(function (res) {
      return res.ok ? res.json() : Promise.reject(new Error("bad response"));
    })
    .then(function (data) {
      const info = {
        title: data.title || "Untitled song",
        artist: data.author_name || "",
      };
      videoInfoCache[videoId] = info;
      return info;
    })
    .catch(function () {
      const info = { title: "Untitled song", artist: "" };
      videoInfoCache[videoId] = info;
      return info;
    });
}

function highlightActiveListItem() {
  const items = els.listItems.querySelectorAll(".list-item");
  items.forEach(function (item) {
    const active = Number(item.dataset.index) === currentIndex;
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

els.listBtn.addEventListener("click", function (ev) {
  ev.stopPropagation();
  if (els.listPanel.hidden) openListPanel();
  else closeListPanel();
});
els.listCloseBtn.addEventListener("click", closeListPanel);

// Tap anywhere outside the open list to close it.
document.addEventListener("click", function (ev) {
  if (els.listPanel.hidden) return;
  if (!els.listPanel.contains(ev.target) && ev.target !== els.listBtn) {
    closeListPanel();
  }
});

// Keyboard shortcuts (nice on desktop): Space = play/pause,
// ← / → = skip 10 seconds.
document.addEventListener("keydown", function (ev) {
  const tag = (ev.target.tagName || "").toLowerCase();
  if (
    tag === "input" ||
    tag === "button" ||
    tag === "textarea" ||
    tag === "select"
  ) {
    return;
  }
  if (ev.code === "Space") {
    ev.preventDefault();
    togglePlay();
  } else if (ev.code === "ArrowLeft") {
    seekBy(-10);
  } else if (ev.code === "ArrowRight") {
    seekBy(10);
  }
});

// ============================================================
// Clock
// ============================================================
function startClock() {
  const timeEl = document.getElementById("clockTime");
  const ampmEl = document.getElementById("clockAmPm");
  const dateEl = document.getElementById("clockDate");
  const tick = function () {
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
  const tryNext = function () {
    if (i >= candidates.length) return;
    const img = new Image();
    img.onload = function () {
      document.body.classList.add("has-bg");
    };
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
