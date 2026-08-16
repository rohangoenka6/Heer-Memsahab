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
let playerReady = false;

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
      playsinline: 1,
      enablejsapi: 1,
      origin: "https://rohangoenka6.github.io",
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
  playerReady = true;
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

/* =========================================================
   MEMSAHAB PLAYER — PROGRESS BAR + PLAYLIST LIST
   ========================================================= */

(function () {
  let progressBar = null;
  let currentTimeText = null;
  let durationText = null;
  let listPanel = null;

  function formatTime(seconds) {
    seconds = Math.floor(Number(seconds) || 0);

    const minutes = Math.floor(seconds / 60);
    const secs = String(seconds % 60).padStart(2, "0");

    return minutes + ":" + secs;
  }

  function seekBy(seconds) {
    if (!player || !playerReady) return;

    try {
      const current = player.getCurrentTime();
      const duration = player.getDuration();

      player.seekTo(
        Math.max(0, Math.min(duration, current + seconds)),
        true
      );
    } catch (error) {
      console.log("Seek error:", error);
    }
  }

  function updateProgress() {
    if (!player || !playerReady || !progressBar) return;

    try {
      const current = player.getCurrentTime();
      const duration = player.getDuration();

      if (duration > 0) {
        progressBar.max = duration;
        progressBar.value = current;

        if (currentTimeText) {
          currentTimeText.textContent = formatTime(current);
        }

        if (durationText) {
          durationText.textContent = formatTime(duration);
        }
      }
    } catch (error) {
      // Player may temporarily be unavailable
    }
  }

  /* =========================================================
     CREATE PROGRESS BAR
     ========================================================= */

  function createProgressControls() {

    if (document.getElementById("memsahab-progress-row")) {
      return;
    }

    const playerBar =
      document.querySelector(".pb-info") ||
      document.querySelector(".player-info") ||
      document.querySelector(".now-playing");

    if (!playerBar) {
      console.log("MemSahab: player info area not found.");
      return;
    }

    const row = document.createElement("div");

    row.id = "memsahab-progress-row";

    row.style.cssText = `
      width:100%;
      display:flex;
      align-items:center;
      gap:6px;
      margin-top:5px;
      box-sizing:border-box;
    `;

    /* ---------- Back 10 ---------- */

    const backButton = document.createElement("button");

    backButton.textContent = "↶10";

    backButton.title = "Back 10 seconds";

    backButton.style.cssText = `
      border:0;
      background:transparent;
      color:rgba(255,255,255,.65);
      font-size:10px;
      padding:2px 3px;
      cursor:pointer;
    `;

    backButton.onclick = function (event) {
      event.stopPropagation();
      seekBy(-10);
    };

    /* ---------- Current time ---------- */

    currentTimeText = document.createElement("span");

    currentTimeText.textContent = "0:00";

    currentTimeText.style.cssText = `
      color:rgba(255,255,255,.55);
      font-size:9px;
      min-width:28px;
      text-align:center;
    `;

    /* ---------- Progress ---------- */

    progressBar = document.createElement("input");

    progressBar.type = "range";
    progressBar.min = "0";
    progressBar.max = "100";
    progressBar.value = "0";
    progressBar.step = "0.1";

    progressBar.style.cssText = `
      flex:1;
      min-width:40px;
      height:3px;
      cursor:pointer;
      accent-color:#ffd98a;
    `;

    progressBar.addEventListener("input", function () {

      if (!player || !playerReady) return;

      try {
        player.seekTo(Number(this.value), true);
      } catch (error) {
        console.log("Progress seek error:", error);
      }

    });

    /* ---------- Duration ---------- */

    durationText = document.createElement("span");

    durationText.textContent = "0:00";

    durationText.style.cssText = `
      color:rgba(255,255,255,.55);
      font-size:9px;
      min-width:28px;
      text-align:center;
    `;

    /* ---------- Forward 10 ---------- */

    const forwardButton = document.createElement("button");

    forwardButton.textContent = "10↷";

    forwardButton.title = "Forward 10 seconds";

    forwardButton.style.cssText = `
      border:0;
      background:transparent;
      color:rgba(255,255,255,.65);
      font-size:10px;
      padding:2px 3px;
      cursor:pointer;
    `;

    forwardButton.onclick = function (event) {
      event.stopPropagation();
      seekBy(10);
    };

    row.append(
      backButton,
      currentTimeText,
      progressBar,
      durationText,
      forwardButton
    );

    playerBar.appendChild(row);
  }


  /* =========================================================
     CREATE LIST BUTTON
     ========================================================= */

  function createListButton() {

    if (document.getElementById("memsahab-list-button")) {
      return;
    }

    const controls =
      document.querySelector(".pb-controls") ||
      document.querySelector(".player-controls");

    if (!controls) {
      console.log("MemSahab: player controls not found.");
      return;
    }

    const button = document.createElement("button");

    button.id = "memsahab-list-button";

    button.textContent = "☰ List";

    button.title = "View songs";

    button.style.cssText = `
      height:34px;
      padding:0 11px;
      border-radius:18px;
      border:1px solid rgba(255,255,255,.15);
      background:rgba(255,255,255,.08);
      color:white;
      cursor:pointer;
      font-size:11px;
      white-space:nowrap;
      margin-right:5px;
    `;

    button.onclick = function (event) {

      event.stopPropagation();

      if (!listPanel) {
        createPlaylistPanel();
      }

      if (listPanel.style.display === "none") {

        listPanel.style.display = "block";

        populatePlaylist();

      } else {

        listPanel.style.display = "none";

      }

    };

    controls.insertBefore(button, controls.firstChild);
  }


  /* =========================================================
     PLAYLIST PANEL
     ========================================================= */

  function createPlaylistPanel() {

    listPanel = document.createElement("div");

    listPanel.id = "memsahab-playlist-panel";

    listPanel.style.cssText = `
      position:fixed;
      left:50%;
      bottom:105px;
      transform:translateX(-50%);
      width:min(420px,calc(100% - 24px));
      max-height:55vh;
      overflow-y:auto;
      background:rgba(14,10,24,.97);
      border:1px solid rgba(255,255,255,.14);
      border-radius:20px;
      padding:12px;
      box-sizing:border-box;
      box-shadow:0 20px 60px rgba(0,0,0,.55);
      backdrop-filter:blur(20px);
      -webkit-backdrop-filter:blur(20px);
      z-index:99999;
      display:none;
    `;

    /* ---------- Header ---------- */

    const header = document.createElement("div");

    header.style.cssText = `
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:4px 5px 10px;
      color:white;
      font-size:13px;
      font-weight:600;
    `;

    const title = document.createElement("span");

    title.textContent = "❤️ Heer Memsahab";

    const closeButton = document.createElement("button");

    closeButton.textContent = "×";

    closeButton.style.cssText = `
      border:0;
      background:transparent;
      color:white;
      font-size:22px;
      cursor:pointer;
      padding:0 5px;
    `;

    closeButton.onclick = function () {
      listPanel.style.display = "none";
    };

    header.append(title, closeButton);

    listPanel.appendChild(header);

    document.body.appendChild(listPanel);
  }


  /* =========================================================
     LOAD PLAYLIST SONGS
     ========================================================= */

  function populatePlaylist() {

    if (!player || !listPanel) return;

    try {

      const playlist = player.getPlaylist();

      if (!playlist || !playlist.length) {
        return;
      }

      /* Remove old song entries */

      const oldSongs =
        listPanel.querySelectorAll(".memsahab-song-item");

      oldSongs.forEach(function (song) {
        song.remove();
      });


      playlist.forEach(function (videoId, index) {

        const item = document.createElement("button");

        item.className = "memsahab-song-item";

        item.style.cssText = `
          width:100%;
          display:block;
          text-align:left;
          border:0;
          border-radius:12px;
          padding:9px;
          margin:2px 0;
          background:transparent;
          color:white;
          cursor:pointer;
          box-sizing:border-box;
        `;

        item.innerHTML = `
          <div style="
            color:#ffd98a;
            font-size:9px;
            margin-bottom:2px;
          ">
            DAY ${String(index + 1).padStart(2, "0")}
          </div>

          <div class="memsahab-song-title" style="
            font-size:12px;
            white-space:nowrap;
            overflow:hidden;
            text-overflow:ellipsis;
          ">
            Loading song...
          </div>
        `;


        item.onmouseenter = function () {
          item.style.background =
            "rgba(255,255,255,.08)";
        };

        item.onmouseleave = function () {
          item.style.background =
            "transparent";
        };


        item.onclick = function () {

          try {

            player.playVideoAt(index);

            listPanel.style.display = "none";

          } catch (error) {

            console.log(
              "Could not play selected song:",
              error
            );

          }

        };


        listPanel.appendChild(item);


        /* Get YouTube title */

        fetch(
          "https://www.youtube.com/oembed?url=" +
          encodeURIComponent(
            "https://www.youtube.com/watch?v=" + videoId
          ) +
          "&format=json"
        )
        .then(function (response) {
          return response.json();
        })
        .then(function (data) {

          const titleElement =
            item.querySelector(
              ".memsahab-song-title"
            );

          if (titleElement) {
            titleElement.textContent =
              data.title || "Untitled Song";
          }

        })
        .catch(function () {

          const titleElement =
            item.querySelector(
              ".memsahab-song-title"
            );

          if (titleElement) {
            titleElement.textContent =
              "Song " + (index + 1);
          }

        });

      });

    } catch (error) {

      console.log(
        "Could not load playlist:",
        error
      );

    }

  }


  /* =========================================================
     INITIALIZE EXTRA CONTROLS
     ========================================================= */

  function initializeMemsahabControls() {

    createProgressControls();

    createListButton();

  }


  /* =========================================================
     WAIT FOR PLAYER UI
     ========================================================= */

  window.addEventListener("load", function () {

    let attempts = 0;

    const timer = setInterval(function () {

      attempts++;

      initializeMemsahabControls();

      if (
        document.getElementById(
          "memsahab-progress-row"
        ) &&
        document.getElementById(
          "memsahab-list-button"
        )
      ) {

        clearInterval(timer);

      }

      if (attempts > 30) {
        clearInterval(timer);
      }

    }, 500);

  });


  /* =========================================================
     UPDATE PROGRESS EVERY HALF SECOND
     ========================================================= */

  setInterval(function () {

    updateProgress();

  }, 500);

})();
