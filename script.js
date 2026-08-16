// ============================================================
// HEER MEMSAHAB — MUSIC PLAYER
// ============================================================

const PLAYLIST_ID = "PLWy_M1Gs9zY8";
const START_VIDEO_ID = "LUgpPmj6nR8";

const START_DATE = new Date(2026, 7, 16);
const DAY_MS = 24 * 60 * 60 * 1000;

const SITE_ORIGIN = "https://rohangoenka6.github.io";


// ============================================================
// PAGE ELEMENTS
// ============================================================

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


// ============================================================
// PLAYER STATE
// ============================================================

let player = null;

let playerReady = false;
let isPlaying = false;

let playlistLength = 0;
let currentIndex = 0;

let progressTimer = null;

let progressRange = null;
let currentTimeEl = null;
let durationEl = null;

let userSeeking = false;

let playlistItems = [];
let listPanel = null;


// ============================================================
// DAY CALCULATION
// ============================================================

function todayIndex() {

  const diff =
    Math.floor(
      (Date.now() - START_DATE.getTime()) /
      DAY_MS
    );

  return Math.max(0, diff);
}


// ============================================================
// TIME FORMAT
// ============================================================

function formatTime(seconds) {

  if (
    !Number.isFinite(seconds) ||
    seconds < 0
  ) {
    return "0:00";
  }

  const total =
    Math.floor(seconds);

  const minutes =
    Math.floor(total / 60);

  const secondsPart =
    String(total % 60).padStart(2, "0");

  return minutes + ":" + secondsPart;
}


// ============================================================
// CREATE PROGRESS BAR + LIST BUTTON
// ============================================================

function buildSeekUI() {

  const info =
    document.querySelector(".pb-info");

  const controls =
    document.querySelector(".pb-controls");


  if (!info || !controls) {
    return;
  }


  if (
    document.getElementById(
      "memsahabSeek"
    )
  ) {
    return;
  }


  // ----------------------------------------------------------
  // PROGRESS ROW
  // ----------------------------------------------------------

  const row =
    document.createElement("div");

  row.id =
    "memsahabSeek";

  row.style.cssText = `
    display:flex;
    align-items:center;
    gap:5px;
    margin-top:5px;
    width:100%;
    box-sizing:border-box;
  `;


  // ----------------------------------------------------------
  // BACK 10 SECONDS
  // ----------------------------------------------------------

  const back =
    document.createElement("button");

  back.type = "button";

  back.textContent = "↶10";

  back.title =
    "Back 10 seconds";

  back.style.cssText = `
    border:0;
    background:transparent;
    color:rgba(255,255,255,.72);
    font-size:10px;
    padding:0 2px;
    cursor:pointer;
  `;

  back.onclick = function () {
    seekBy(-10);
  };


  // ----------------------------------------------------------
  // CURRENT TIME
  // ----------------------------------------------------------

  const now =
    document.createElement("span");

  now.textContent =
    "0:00";

  now.style.cssText = `
    font-size:9px;
    color:rgba(255,255,255,.55);
    min-width:28px;
    text-align:right;
  `;


  // ----------------------------------------------------------
  // PROGRESS RANGE
  // ----------------------------------------------------------

  const range =
    document.createElement("input");

  range.type = "range";

  range.id =
    "memsahabProgress";

  range.min = "0";
  range.max = "100";
  range.step = "0.1";
  range.value = "0";

  range.title =
    "Song progress";

  range.style.cssText = `
    flex:1;
    min-width:60px;
    height:3px;
    accent-color:#ffd98a;
    cursor:pointer;
  `;


  range.addEventListener(
    "input",
    function () {

      userSeeking = true;

      now.textContent =
        formatTime(
          Number(this.value)
        );
    }
  );


  range.addEventListener(
    "change",
    function () {

      if (
        player &&
        playerReady
      ) {

        try {

          player.seekTo(
            Number(this.value),
            true
          );

        } catch (e) {}

      }

      userSeeking = false;

      updateProgress();
    }
  );


  // ----------------------------------------------------------
  // TOTAL TIME
  // ----------------------------------------------------------

  const total =
    document.createElement("span");

  total.textContent =
    "0:00";

  total.style.cssText = `
    font-size:9px;
    color:rgba(255,255,255,.45);
    min-width:28px;
  `;


  // ----------------------------------------------------------
  // FORWARD 10 SECONDS
  // ----------------------------------------------------------

  const forward =
    document.createElement("button");

  forward.type = "button";

  forward.textContent =
    "10↷";

  forward.title =
    "Forward 10 seconds";

  forward.style.cssText = `
    border:0;
    background:transparent;
    color:rgba(255,255,255,.72);
    font-size:10px;
    padding:0 2px;
    cursor:pointer;
  `;

  forward.onclick = function () {
    seekBy(10);
  };


  row.append(
    back,
    now,
    range,
    total,
    forward
  );

  info.appendChild(row);


  progressRange = range;
  currentTimeEl = now;
  durationEl = total;


  // ----------------------------------------------------------
  // LIST BUTTON
  // ----------------------------------------------------------

  const listBtn =
    document.createElement("button");

  listBtn.id =
    "memsahabListBtn";

  listBtn.type = "button";

  listBtn.textContent =
    "☰ List";

  listBtn.title =
    "Show playlist";

  listBtn.style.cssText = `
    height:2.25rem;
    padding:0 .65rem;
    border-radius:999px;
    border:1px solid rgba(255,255,255,.14);
    background:rgba(255,255,255,.08);
    color:#fff;
    font-size:.72rem;
    cursor:pointer;
    white-space:nowrap;
  `;


  listBtn.onclick =
    function () {

      toggleListPanel();
    };


  controls.insertBefore(
    listBtn,
    controls.firstChild
  );


  // Create playlist panel
  buildListPanel();
}


// ============================================================
// PLAYLIST PANEL
// ============================================================

function buildListPanel() {

  if (listPanel) {
    return;
  }


  listPanel =
    document.createElement("div");

  listPanel.id =
    "memsahabListPanel";

  listPanel.style.cssText = `
    position:fixed;
    left:50%;
    bottom:calc(max(1rem, env(safe-area-inset-bottom)) + 5.8rem);
    transform:translateX(-50%);
    width:min(430px,calc(100% - 1.5rem));
    max-height:55vh;
    overflow:auto;

    padding:10px;

    border-radius:20px;

    background:rgba(12,9,27,.96);

    border:1px solid
      rgba(255,255,255,.14);

    backdrop-filter:blur(22px);
    -webkit-backdrop-filter:blur(22px);

    box-shadow:
      0 20px 60px
      rgba(0,0,0,.55);

    z-index:99999;

    display:none;

    box-sizing:border-box;
  `;


  // ----------------------------------------------------------
  // HEADER
  // ----------------------------------------------------------

  const header =
    document.createElement("div");

  header.style.cssText = `
    display:flex;
    align-items:center;
    justify-content:space-between;

    padding:4px 6px 9px;

    color:#fff;

    font-weight:600;

    font-size:.9rem;
  `;


  const title =
    document.createElement("span");

  title.textContent =
    "❤️ Heer Memsahab — Playlist";


  const close =
    document.createElement("button");

  close.type = "button";

  close.textContent =
    "×";

  close.style.cssText = `
    border:0;
    background:transparent;
    color:rgba(255,255,255,.7);
    font-size:1.35rem;
    cursor:pointer;
  `;


  close.onclick =
    function () {

      toggleListPanel(false);
    };


  header.append(
    title,
    close
  );


  listPanel.appendChild(
    header
  );


  // ----------------------------------------------------------
  // SONG LIST CONTAINER
  // ----------------------------------------------------------

  const list =
    document.createElement("div");

  list.id =
    "memsahabList";


  list.innerHTML = `
    <div
      style="
        padding:14px 8px;
        color:rgba(255,255,255,.55);
        font-size:.78rem;
      "
    >
      Loading songs…
    </div>
  `;


  listPanel.appendChild(
    list
  );


  document.body.appendChild(
    listPanel
  );
}


// ============================================================
// OPEN / CLOSE PLAYLIST
// ============================================================

function toggleListPanel(force) {

  if (!listPanel) {
    buildListPanel();
  }


  const show =
    typeof force === "boolean"
      ? force
      : listPanel.style.display === "none";


  listPanel.style.display =
    show
      ? "block"
      : "none";


  if (show) {

    populatePlaylistList();
  }
}


// ============================================================
// GET PLAYLIST SONGS
// ============================================================

async function populatePlaylistList() {

  const listEl =
    document.getElementById(
      "memsahabList"
    );


  if (
    !listEl ||
    !player ||
    !playerReady
  ) {
    return;
  }


  let ids = [];


  try {

    ids =
      player.getPlaylist
        ? player.getPlaylist() || []
        : [];

  } catch (e) {

    ids = [];
  }


  if (!ids.length) {

    listEl.innerHTML = `
      <div
        style="
          padding:14px 8px;
          color:rgba(255,255,255,.55);
          font-size:.78rem;
        "
      >
        Playlist is still loading…
        <br><br>
        Please tap List again in a moment.
      </div>
    `;

    return;
  }


  playlistItems =
    ids.map(
      function (id, index) {

        return {
          id: id,
          index: index,
          title:
            "Song " +
            String(index + 1)
              .padStart(2, "0"),
          artist: ""
        };

      }
    );


  renderPlaylistList();


  // ----------------------------------------------------------
  // GET YOUTUBE TITLES
  // ----------------------------------------------------------

  await Promise.all(

    playlistItems.map(
      async function (item) {

        try {

          const response =
            await fetch(
              "https://www.youtube.com/oembed?url=" +
              encodeURIComponent(
                "https://www.youtube.com/watch?v=" +
                item.id
              ) +
              "&format=json"
            );


          if (!response.ok) {
            return;
          }


          const data =
            await response.json();


          item.title =
            data.title ||
            item.title;


          item.artist =
            data.author_name ||
            "";


          renderPlaylistList();

        } catch (e) {

          // Keep fallback Song 01, Song 02 etc.
        }

      }
    )

  );
}


// ============================================================
// RENDER PLAYLIST
// ============================================================

function renderPlaylistList() {

  const listEl =
    document.getElementById(
      "memsahabList"
    );


  if (!listEl) {
    return;
  }


  listEl.innerHTML = "";


  playlistItems.forEach(
    function (item) {

      const row =
        document.createElement(
          "button"
        );


      row.type =
        "button";


      row.style.cssText = `
        width:100%;

        display:flex;

        align-items:center;

        gap:10px;

        text-align:left;

        border:0;

        border-radius:12px;

        padding:9px 8px;

        background:
          ${
            item.index === currentIndex
              ? "rgba(255,217,138,.14)"
              : "transparent"
          };

        color:#fff;

        cursor:pointer;

        margin-bottom:2px;
      `;


      // ------------------------------------------------------
      // NUMBER
      // ------------------------------------------------------

      const num =
        document.createElement(
          "span"
        );

      num.textContent =
        String(item.index + 1)
          .padStart(2, "0");


      num.style.cssText = `
        width:28px;

        color:#ffd98a;

        font-size:.7rem;

        font-weight:700;
      `;


      // ------------------------------------------------------
      // TEXT
      // ------------------------------------------------------

      const text =
        document.createElement(
          "span"
        );


      text.style.cssText = `
        min-width:0;
        display:block;
      `;


      const name =
        document.createElement(
          "span"
        );


      name.textContent =
        item.title;


      name.style.cssText = `
        display:block;

        white-space:nowrap;

        overflow:hidden;

        text-overflow:ellipsis;

        font-size:.8rem;

        font-weight:600;
      `;


      const artist =
        document.createElement(
          "span"
        );


      artist.textContent =
        item.artist;


      artist.style.cssText = `
        display:block;

        white-space:nowrap;

        overflow:hidden;

        text-overflow:ellipsis;

        color:
          rgba(255,255,255,.48);

        font-size:.68rem;

        margin-top:2px;
      `;


      text.append(
        name,
        artist
      );


      row.append(
        num,
        text
      );


      // ------------------------------------------------------
      // PLAY SELECTED SONG
      // ------------------------------------------------------

      row.onclick =
        function () {

          currentIndex =
            item.index;


          try {

            player.playVideoAt(
              item.index
            );

          } catch (e) {

            // If playlist navigation isn't
            // ready, explicitly load it.

            try {

              player.loadPlaylist(
                PLAYLIST_ID,
                item.index
              );

            } catch (error) {}

          }


          toggleListPanel(
            false
          );


          renderPlaylistList();
        };


      listEl.appendChild(
        row
      );

    }
  );
}


// ============================================================
// INITIALIZE YOUTUBE PLAYER
// ============================================================

function initPlayer(
  autoplay = false
) {

  if (player) {
    return;
  }


  player =
    new YT.Player(
      "ytPlayer",
      {

        width: "1",

        height: "1",

        playerVars: {

          autoplay:
            autoplay ? 1 : 0,

          controls: 0,

          rel: 0,

          fs: 0,

          iv_load_policy: 3,

          playsinline: 1,

          enablejsapi: 1,

          origin:
            SITE_ORIGIN,

          listType:
            "playlist",

          list:
            PLAYLIST_ID

        },


        events: {

          onReady:
            onPlayerReady,

          onStateChange:
            onPlayerStateChange,

          onError:
            onPlayerError

        }

      }
    );
}


// ============================================================
// PLAYER READY
// ============================================================

function onPlayerReady() {

  playerReady = true;


  // Build our custom controls
  buildSeekUI();


  // Make iframe permissions explicit
  const iframe =
    player.getIframe
      ? player.getIframe()
      : null;


  if (iframe) {

    iframe.setAttribute(
      "allow",
      "autoplay; encrypted-media; picture-in-picture; fullscreen"
    );

    iframe.setAttribute(
      "allowfullscreen",
      "true"
    );

    iframe.setAttribute(
      "title",
      "Heer Memsahab music player"
    );
  }


  // Wait until YouTube exposes
  // the complete playlist.
  waitForPlaylist();


  startProgressTimer();
}


// ============================================================
// WAIT FOR COMPLETE PLAYLIST
// ============================================================

function waitForPlaylist() {

  let attempts = 0;

  const maxAttempts = 20;


  const timer =
    setInterval(
      function () {

        attempts++;


        try {

          const list =
            player.getPlaylist
              ? player.getPlaylist() || []
              : [];


          if (list.length) {

            clearInterval(
              timer
            );


            playlistLength =
              list.length;


            currentIndex =
              todayIndex() %
              playlistLength;


            // Cue today's song.
            // Do not force autoplay.

            player.cueVideoById(
              list[currentIndex]
            );


            setTimeout(
              updateFromVideo,
              200
            );


            renderPlaylistList();


            return;
          }

        } catch (e) {}


        // ----------------------------------------------------
        // AFTER 5 SECONDS:
        // EXPLICITLY ASK YOUTUBE TO LOAD THE PLAYLIST
        // ----------------------------------------------------

        if (attempts === 10) {

          try {

            player.loadPlaylist(
              PLAYLIST_ID,
              todayIndex()
            );

          } catch (e) {}
        }


        // ----------------------------------------------------
        // FINAL FALLBACK
        // ----------------------------------------------------

        if (
          attempts >=
          maxAttempts
        ) {

          clearInterval(
            timer
          );


          try {

            const list =
              player.getPlaylist
                ? player.getPlaylist() || []
                : [];


            if (list.length) {

              playlistLength =
                list.length;


              currentIndex =
                todayIndex() %
                playlistLength;


              player.cueVideoById(
                list[currentIndex]
              );

            } else {

              playlistLength =
                0;

              currentIndex =
                0;


              player.cueVideoById(
                START_VIDEO_ID
              );

            }

          } catch (e) {

            player.cueVideoById(
              START_VIDEO_ID
            );
          }


          updateFromVideo();
        }

      },
      500
    );
}


// ============================================================
// YOUTUBE ERROR
// ============================================================

function onPlayerError(e) {

  const code =
    e.data;


  if (code === 2) {

    els.songNote.textContent =
      "⚠️ Invalid YouTube video request";

  } else if (code === 5) {

    els.songNote.textContent =
      "⚠️ YouTube player error";

  } else if (code === 100) {

    els.songNote.textContent =
      "⚠️ Video not found or removed";

  } else if (
    code === 101 ||
    code === 150
  ) {

    els.songNote.textContent =
      "⚠️ This video can't be embedded here";

  } else if (code === 153) {

    els.songNote.textContent =
      "⚠️ YouTube connection error — refresh once";

  } else {

    els.songNote.textContent =
      "⚠️ Playback error (code " +
      code +
      ")";
  }
}


// ============================================================
// UPDATE CURRENT SONG INFORMATION
// ============================================================

function updateFromVideo() {

  els.dayBadge.textContent =
    "❤️ DAY " +
    String(
      todayIndex() + 1
    ).padStart(2, "0");


  if (
    !player ||
    !player.getVideoData
  ) {
    return;
  }


  try {

    const data =
      player.getVideoData();


    if (
      data &&
      data.title
    ) {

      els.songTitle.textContent =
        data.title;
    }


    if (
      data &&
      data.author
    ) {

      els.songArtist.textContent =
        data.author;
    }


    if (
      data &&
      data.video_id
    ) {

      els.songCover.src =
        "https://i.ytimg.com/vi/" +
        data.video_id +
        "/mqdefault.jpg";


      els.songCover.alt =
        data.title ||
        "Song cover";
    }


  } catch (e) {}
}


// ============================================================
// PLAYER STATE CHANGES
// ============================================================

function onPlayerStateChange(e) {

  if (
    e.data ===
    YT.PlayerState.PLAYING
  ) {

    isPlaying = true;

    setPlayBtn(true);

    updateFromVideo();


    // Find current playlist index
    try {

      const ids =
        player.getPlaylist
          ? player.getPlaylist() || []
          : [];


      const currentId =
        player.getVideoData
          ? player.getVideoData()
              .video_id
          : null;


      const found =
        ids.indexOf(
          currentId
        );


      if (found >= 0) {

        currentIndex =
          found;

        playlistLength =
          ids.length;
      }

    } catch (e) {}


    renderPlaylistList();

    updateProgress();


  } else if (
    e.data ===
      YT.PlayerState.PAUSED ||
    e.data ===
      YT.PlayerState.CUED
  ) {

    isPlaying = false;

    setPlayBtn(false);

    updateProgress();


  } else if (
    e.data ===
    YT.PlayerState.ENDED
  ) {

    isPlaying = false;

    setPlayBtn(false);


    // Automatically move to next song
    changeSong(1);
  }
}


// ============================================================
// PLAY / PAUSE BUTTON
// ============================================================

function setPlayBtn(
  playing
) {

  els.playBtn.textContent =
    playing
      ? "⏸"
      : "▶";
}


function togglePlay() {

  if (!player) {

    initPlayer(true);

    return;
  }


  if (!playerReady) {
    return;
  }


  if (isPlaying) {

    player.pauseVideo();

  } else {

    player.playVideo();
  }
}


// ============================================================
// PREVIOUS / NEXT
// ============================================================

function changeSong(
  direction
) {

  if (
    !player ||
    !playerReady
  ) {
    return;
  }


  if (
    playlistLength > 1
  ) {

    currentIndex +=
      direction;


    if (
      currentIndex < 0
    ) {

      currentIndex =
        playlistLength - 1;
    }


    if (
      currentIndex >=
      playlistLength
    ) {

      currentIndex =
        0;
    }


    try {

      player.playVideoAt(
        currentIndex
      );

    } catch (e) {

      try {

        player.loadPlaylist(
          PLAYLIST_ID,
          currentIndex
        );

      } catch (error) {}
    }


    renderPlaylistList();

    return;
  }


  // If the playlist has not yet
  // been exposed by YouTube,
  // explicitly load it.

  try {

    currentIndex =
      Math.max(
        0,
        currentIndex +
        direction
      );


    player.loadPlaylist(
      PLAYLIST_ID,
      currentIndex
    );

  } catch (e) {}
}


// ============================================================
// SEEK
// ============================================================

function seekBy(
  seconds
) {

  if (
    !player ||
    !playerReady
  ) {
    return;
  }


  try {

    const current =
      player.getCurrentTime() ||
      0;


    const duration =
      player.getDuration() ||
      0;


    const target =
      Math.max(
        0,
        Math.min(
          duration ||
            Infinity,
          current +
            seconds
        )
      );


    player.seekTo(
      target,
      true
    );

  } catch (e) {}
}


// ============================================================
// UPDATE PROGRESS BAR
// ============================================================

function updateProgress() {

  if (
    !player ||
    !playerReady ||
    !progressRange ||
    userSeeking
  ) {
    return;
  }


  try {

    const current =
      player.getCurrentTime() ||
      0;


    const duration =
      player.getDuration() ||
      0;


    progressRange.max =
      duration || 100;


    progressRange.value =
      Math.min(
        current,
        duration || 100
      );


    currentTimeEl.textContent =
      formatTime(
        current
      );


    durationEl.textContent =
      formatTime(
        duration
      );


  } catch (e) {}
}


// ============================================================
// PROGRESS TIMER
// ============================================================

function startProgressTimer() {

  if (progressTimer) {

    clearInterval(
      progressTimer
    );
  }


  progressTimer =
    setInterval(
      updateProgress,
      500
    );
}


// ============================================================
// EXISTING PLAYER BUTTONS
// ============================================================

els.playBtn.addEventListener(
  "click",
  togglePlay
);


els.heartBtn.addEventListener(
  "click",
  togglePlay
);


els.prevBtn.addEventListener(
  "click",
  function () {

    changeSong(-1);
  }
);


els.nextBtn.addEventListener(
  "click",
  function () {

    changeSong(1);
  }
);


// ============================================================
// CLOCK
// ============================================================

function startClock() {

  const timeEl =
    document.getElementById(
      "clockTime"
    );

  const ampmEl =
    document.getElementById(
      "clockAmPm"
    );

  const dateEl =
    document.getElementById(
      "clockDate"
    );


  const tick =
    function () {

      const now =
        new Date();


      let h =
        now.getHours();


      const ampm =
        h >= 12
          ? "PM"
          : "AM";


      h =
        h % 12 ||
        12;


      const mm =
        String(
          now.getMinutes()
        ).padStart(
          2,
          "0"
        );


      timeEl.textContent =
        h + ":" + mm;


      ampmEl.textContent =
        ampm;


      dateEl.textContent =
        now.toLocaleDateString(
          "en-GB",
          {
            weekday: "short",
            day: "numeric",
            month: "short"
          }
        );
    };


  tick();


  setInterval(
    tick,
    1000
  );
}


// ============================================================
// WEATHER
// ============================================================

function wmoEmoji(
  code
) {

  if (code === 0)
    return "☀️";

  if (code <= 2)
    return "⛅";

  if (
    code === 3 ||
    code === 45 ||
    code === 48
  )
    return "☁️";

  if (code <= 67)
    return "🌧️";

  if (code <= 77)
    return "🌨️";

  if (code <= 82)
    return "🌦️";

  if (code <= 86)
    return "🌨️";

  return "⛈️";
}


async function fetchWeather(
  lat,
  lon,
  el
) {

  try {

    const response =
      await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=" +
        lat +
        "&longitude=" +
        lon +
        "&current=temperature_2m,weather_code"
      );


    if (!response.ok) {
      throw new Error(
        "weather request failed"
      );
    }


    const data =
      await response.json();


    const temp =
      Math.round(
        data.current
          .temperature_2m
      );


    el.textContent =
      wmoEmoji(
        data.current
          .weather_code
      ) +
      " " +
      temp +
      "°";


  } catch (e) {

    el.textContent =
      "🌙";
  }
}


function initWeather() {

  const el =
    document.getElementById(
      "weatherTxt"
    );


  fetchWeather(
    18.5204,
    73.8567,
    el
  );
}


// ============================================================
// BACKGROUND
// ============================================================

function checkBackground() {

  const candidates = [
    "background.png",
    "background.jpg"
  ];


  let i = 0;


  const tryNext =
    function () {

      if (
        i >=
        candidates.length
      ) {
        return;
      }


      const img =
        new Image();


      img.onload =
        function () {

          document.body.classList.add(
            "has-bg"
          );
        };


      img.onerror =
        tryNext;


      img.src =
        candidates[i++];
    };


  tryNext();
}


// ============================================================
// YOUTUBE API CALLBACK
// ============================================================

function onYouTubeIframeAPIReady() {

  initPlayer(false);
}


window.onYouTubeIframeAPIReady =
  onYouTubeIframeAPIReady;


// ============================================================
// START PAGE FEATURES
// ============================================================

checkBackground();

startClock();

initWeather();
