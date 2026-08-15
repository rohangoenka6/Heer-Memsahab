// Memsahab — daily song from the playlist

const PLAYLIST_ID = "PLWy_M1Gs9zY8";
const START_DATE = new Date(2026, 7, 16); // first day
const DAY_MS = 24 * 60 * 60 * 1000;

const els = {
  dayBadge: document.getElementById("dayBadge"),
  songTitle: document.getElementById("songTitle"),
  songArtist: document.getElementById("songArtist"),
  songNote: document.getElementById("songNote"),
  songCover: document.getElementById("songCover"),
  playBtn: document.getElementById("playBtn"),
  heartBtn: document.getElementById("heartBtn"),
  prevBtn: document.getElementById("prevBtn"),
  nextBtn: document.getElementById("nextBtn"),
};

let player = null;
let isPlaying = false;
let playlistLength = 0;

// ---------- Day counter ----------
function todayIndex() {
  const diff = Math.floor((Date.now() - START_DATE.getTime()) / DAY_MS);
  return Math.max(0, diff);
}

// ---------- Player ----------
function initPlayer(autoplay) {
  player = new YT.Player("ytPlayer", {
    playerVars: {
      autoplay: autoplay ? 1 : 0,
      controls: 0,
      rel: 0,
      fs: 0,
      iv_load_policy: 3,
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

function onPlayerReady() {
  const iframe = player.getIframe
    ? player.getIframe()
    : document.querySelector("#ytPlayer iframe");
  if (iframe) {
    iframe.setAttribute(
      "allow",
      "autoplay; encrypted-media; picture-in-picture; fullscreen"
    );
    iframe.setAttribute("playsinline", "1");
  }

  const list = player.getPlaylist ? player.getPlaylist() : [];
  if (list && list.length) {
    playlistLength = list.length;
    const start = todayIndex() % playlistLength;
    if (start > 0) {
      player.playVideoAt(start);
    }
    updateFromVideo();
  } else {
    // Playlist couldn't load — play the first video directly as a fallback.
    player.loadVideoById("LUgpPmj6nR8");
  }
}

function onPlayerError(e) {
  const code = e.data;
  if (code === 100) {
    els.songNote.textContent = "\u26a0\ufe0f Video not found or removed";
  } else if (code === 101 || code === 150) {
    els.songNote.textContent =
      "\u26a0\ufe0f This video can't be embedded here (blocked)";
  } else {
    els.songNote.textContent = "\u26a0\ufe0f Playback error (code " + code + ")";
  }
}

function onPlayerReady() {
  const list = player.getPlaylist ? player.getPlaylist() : [];
  if (list && list.length) {
    playlistLength = list.length;
    const start = todayIndex() % playlistLength;
    if (start > 0) {
      player.playVideoAt(start);
    }
  }
  updateFromVideo();
}

// Show the real song name, artist and cover straight from YouTube
function updateFromVideo() {
  els.dayBadge.textContent =
    "\u2764\ufe0f DAY " + String(todayIndex() + 1).padStart(2, "0");
  try {
    const d = player.getVideoData();
    if (d && d.title) els.songTitle.textContent = d.title;
    if (d && d.author) els.songArtist.textContent = d.author;
    if (d && d.video_id) {
      els.songCover.src =
        "https://i.ytimg.com/vi/" + d.video_id + "/mqdefault.jpg";
      els.songCover.alt = d.title || "Song cover";
    }
  } catch (e) {
    /* player not ready yet */
  }
}

function onPlayerStateChange(e) {
  if (e.data === YT.PlayerState.PLAYING) {
    isPlaying = true;
    setPlayBtn(true);
    updateFromVideo();
  } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.CUED) {
    isPlaying = false;
    setPlayBtn(false);
  } else if (e.data === YT.PlayerState.ENDED) {
    // Song finished — move to the next song in the playlist.
    player.nextVideo();
  }
}

function setPlayBtn(playing) {
  els.playBtn.textContent = playing ? "\u23f8" : "\u25b6";
}

function togglePlay() {
  if (!player) {
    initPlayer(true);
    return;
  }
  if (isPlaying) {
    player.pauseVideo();
  } else {
    player.playVideo();
  }
}

// ---------- UI wiring ----------
els.playBtn.addEventListener("click", togglePlay);
els.heartBtn.addEventListener("click", togglePlay);
els.prevBtn.addEventListener("click", () => {
  if (player) player.previousVideo();
});
els.nextBtn.addEventListener("click", () => {
  if (player) player.nextVideo();
});

// ---------- Clock ----------
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

// ---------- Weather (tiny pill, left of the clock) ----------
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
  } catch (e) {
    el.textContent = "\ud83c\udf19";
  }
}

function initWeather() {
  const el = document.getElementById("weatherTxt");
  fetchWeather(18.5204, 73.8567, el); // Pune, Maharashtra
}

// ---------- Background (Canva artwork) ----------
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

// ---------- Boot ----------
function onYouTubeIframeAPIReady() {
  initPlayer(false);
}

window.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

checkBackground();
startClock();
initWeather();
