// ============================================================
// HEER MEMSAHAB — COMPLETE MUSIC PLAYER
// ============================================================
// Playlist: PLWy_M1Gs9zY8
// Starting video: LUgpPmj6nR8
// ============================================================

const PLAYLIST_ID = "PLWy_M1Gs9zY8";
const START_VIDEO_ID = "LUgpPmj6nR8";

const START_DATE = new Date(2026, 7, 16);
const DAY_MS = 24 * 60 * 60 * 1000;

const SITE_ORIGIN =
  "https://rohangoenka6.github.io";


// ============================================================
// PAGE ELEMENTS
// ============================================================

const els = {
  dayBadge:
    document.getElementById("dayBadge"),

  songTitle:
    document.getElementById("songTitle"),

  songArtist:
    document.getElementById("songArtist"),

  songNote:
    document.getElementById("songNote"),

  songCover:
    document.getElementById("songCover"),

  playBtn:
    document.getElementById("playBtn"),

  heartBtn:
    document.getElementById("heartBtn"),

  prevBtn:
    document.getElementById("prevBtn"),

  nextBtn:
    document.getElementById("nextBtn")
};


// ============================================================
// PLAYER STATE
// ============================================================

let player = null;

let playerReady = false;

let isPlaying = false;

let playlistIds = [];

let currentIndex = 0;

let playlistPollTimer = null;

let progressTimer = null;

let progressBar = null;

let currentTimeText = null;

let durationText = null;

let listPanel = null;

let listButton = null;

let controlsBuilt = false;

let seeking = false;


// ============================================================
// DAY COUNTER
// ============================================================

function todayIndex() {

  const diff =
    Math.floor(
      (
        Date.now() -
        START_DATE.getTime()
      ) /
      DAY_MS
    );

  return Math.max(
    0,
    diff
  );
}


// ============================================================
// TIME FORMAT
// ============================================================

function formatTime(seconds) {

  seconds =
    Math.floor(
      Number(seconds) || 0
    );

  const minutes =
    Math.floor(
      seconds / 60
    );

  const secs =
    String(
      seconds % 60
    ).padStart(
      2,
      "0"
    );

  return (
    minutes +
    ":" +
    secs
  );
}


// ============================================================
// SAFE TEXT UPDATE
// ============================================================

function safeText(
  element,
  text
) {

  if (element) {
    element.textContent =
      text;
  }
}


// ============================================================
// DAY BADGE
// ============================================================

function updateDayBadge() {

  safeText(
    els.dayBadge,

    "❤️ DAY " +
      String(
        todayIndex() + 1
      ).padStart(
        2,
        "0"
      )
  );
}


// ============================================================
// PLAY BUTTON
// ============================================================

function setPlayButton(
  playing
) {

  safeText(
    els.playBtn,

    playing
      ? "⏸"
      : "▶"
  );
}


// ============================================================
// PLAYER NOTE
// ============================================================

function setNote(
  text
) {

  safeText(
    els.songNote,
    text
  );
}


// ============================================================
// UPDATE SONG INFORMATION
// ============================================================

function updateSongInfo() {

  updateDayBadge();


  if (
    !player ||
    !playerReady
  ) {
    return;
  }


  try {

    const data =
      player.getVideoData();


    if (!data) {
      return;
    }


    if (data.title) {

      safeText(
        els.songTitle,
        data.title
      );
    }


    if (data.author) {

      safeText(
        els.songArtist,
        data.author
      );
    }


    if (
      data.video_id &&
      els.songCover
    ) {

      els.songCover.src =
        "https://i.ytimg.com/vi/" +
        data.video_id +
        "/mqdefault.jpg";

      els.songCover.alt =
        data.title ||
        "Song cover";
    }


    // Find current song inside playlist.

    if (
      playlistIds.length
    ) {

      const found =
        playlistIds.indexOf(
          data.video_id
        );


      if (found >= 0) {

        currentIndex =
          found;

        renderPlaylist();
      }
    }

  } catch (error) {

    console.log(
      "Song info not ready:",
      error
    );
  }
}


// ============================================================
// INITIALIZE YOUTUBE PLAYER
// ============================================================

function initPlayer(
  autoplay
) {

  if (player) {
    return;
  }


  if (
    !window.YT ||
    !YT.Player
  ) {

    setNote(
      "Loading YouTube player…"
    );

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
            autoplay
              ? 1
              : 0,

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

  playerReady =
    true;


  // Give the iframe the required permissions.

  try {

    const iframe =
      player.getIframe();


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
        "playsinline",
        "1"
      );

      iframe.setAttribute(
        "title",
        "Heer Memsahab music player"
      );
    }

  } catch (error) {}


  buildPlayerControls();

  startProgressTimer();

  setNote(
    "Loading your playlist…"
  );


  beginPlaylistPolling();
}


// ============================================================
// WAIT FOR YOUTUBE PLAYLIST
// ============================================================

function beginPlaylistPolling() {

  if (
    playlistPollTimer
  ) {

    clearInterval(
      playlistPollTimer
    );
  }


  let attempts = 0;


  const poll =
    function () {

      attempts++;


      if (
        !player ||
        !playerReady
      ) {
        return;
      }


      try {

        const ids =
          player.getPlaylist
            ? (
                player.getPlaylist() ||
                []
              )
            : [];


        if (
          ids.length
        ) {

          playlistIds =
            ids.slice();


          let desired =
            todayIndex() %
            playlistIds.length;


          if (
            typeof player.getPlaylistIndex ===
            "function"
          ) {

            const idx =
              player.getPlaylistIndex();


            if (
              Number.isFinite(idx) &&
              idx >= 0
            ) {

              currentIndex =
                idx;

            } else {

              currentIndex =
                desired;
            }

          } else {

            currentIndex =
              desired;
          }


          clearInterval(
            playlistPollTimer
          );

          playlistPollTimer =
            null;


          buildPlayerControls();

          renderPlaylist();

          updateSongInfo();


          // Cue the daily song.
          // Do not force autoplay.

          try {

            player.playVideoAt(
              currentIndex
            );

            player.pauseVideo();

          } catch (error) {

            try {

              player.cueVideoById(
                playlistIds[
                  currentIndex
                ]
              );

            } catch (inner) {}
          }


          setNote(
            "From your playlist, for you ❤️"
          );


          return;
        }

      } catch (error) {

        console.log(
          "Playlist polling:",
          error
        );
      }


      // Explicitly request the playlist
      // after a few attempts.

      if (
        attempts === 5
      ) {

        try {

          player.loadPlaylist(
            {
              listType:
                "playlist",

              list:
                PLAYLIST_ID,

              index:
                todayIndex()
            }
          );

        } catch (error) {

          console.log(
            "Playlist load request:",
            error
          );
        }
      }


      // Final fallback.

      if (
        attempts >= 20
      ) {

        clearInterval(
          playlistPollTimer
        );

        playlistPollTimer =
          null;


        try {

          const ids =
            player.getPlaylist
              ? (
                  player.getPlaylist() ||
                  []
                )
              : [];


          if (
            ids.length
          ) {

            playlistIds =
              ids.slice();


            currentIndex =
              todayIndex() %
              playlistIds.length;


            renderPlaylist();

            updateSongInfo();


            return;
          }


          // Only use the first video
          // as a temporary fallback.
          // This does NOT replace the playlist.

          player.cueVideoById(
            START_VIDEO_ID
          );


          safeText(
            els.songTitle,
            "Heer Memsahab"
          );


          safeText(
            els.songArtist,
            "Your playlist"
          );


          setNote(
            "YouTube playlist is still loading. Tap Play to continue."
          );


        } catch (error) {

          console.log(
            "Playlist final fallback:",
            error
          );
        }
      }
    };


  poll();


  playlistPollTimer =
    setInterval(
      poll,
      500
    );
}


// ============================================================
// YOUTUBE PLAYER ERROR
// ============================================================

function onPlayerError(
  event
) {

  const code =
    event &&
    event.data;


  if (
    code === 2
  ) {

    setNote(
      "⚠️ Invalid YouTube video request."
    );

  } else if (
    code === 5
  ) {

    setNote(
      "⚠️ YouTube player error."
    );

  } else if (
    code === 100
  ) {

    setNote(
      "⚠️ This video was removed or is unavailable."
    );

  } else if (
    code === 101 ||
    code === 150
  ) {

    setNote(
      "⚠️ This video can't be embedded here."
    );

  } else if (
    code === 153
  ) {

    setNote(
      "⚠️ YouTube player configuration error — refresh once."
    );

  } else {

    setNote(
      "⚠️ Playback error (code " +
      code +
      ")."
    );
  }
}


// ============================================================
// PLAYER STATE
// ============================================================

function onPlayerStateChange(
  event
) {

  if (
    !window.YT ||
    !YT.PlayerState
  ) {
    return;
  }


  if (
    event.data ===
    YT.PlayerState.PLAYING
  ) {

    isPlaying =
      true;

    setPlayButton(
      true
    );

    updateSongInfo();

    updateProgress();


  } else if (
    event.data ===
      YT.PlayerState.PAUSED ||
    event.data ===
      YT.PlayerState.CUED
  ) {

    isPlaying =
      false;

    setPlayButton(
      false
    );

    updateProgress();


  } else if (
    event.data ===
    YT.PlayerState.ENDED
  ) {

    isPlaying =
      false;

    setPlayButton(
      false
    );

    nextSong();
  }
}


// ============================================================
// PLAY / PAUSE
// ============================================================

function togglePlay() {

  if (!player) {

    initPlayer(
      true
    );

    return;
  }


  if (!playerReady) {
    return;
  }


  try {

    if (
      isPlaying
    ) {

      player.pauseVideo();

    } else {

      player.playVideo();
    }

  } catch (error) {

    console.log(
      "Play/pause error:",
      error
    );
  }
}


// ============================================================
// PREVIOUS SONG
// ============================================================

function previousSong() {

  if (
    !player ||
    !playerReady
  ) {
    return;
  }


  if (
    playlistIds.length
  ) {

    currentIndex =
      (
        currentIndex -
        1 +
        playlistIds.length
      ) %
      playlistIds.length;


    try {

      player.playVideoAt(
        currentIndex
      );

    } catch (error) {

      try {

        player.loadPlaylist(
          {
            listType:
              "playlist",

            list:
              PLAYLIST_ID,

            index:
              currentIndex
          }
        );

      } catch (inner) {}
    }


    renderPlaylist();

    return;
  }


  try {

    player.previousVideo();

  } catch (error) {}
}


// ============================================================
// NEXT SONG
// ============================================================

function nextSong() {

  if (
    !player ||
    !playerReady
  ) {
    return;
  }


  if (
    playlistIds.length
  ) {

    currentIndex =
      (
        currentIndex +
        1
      ) %
      playlistIds.length;


    try {

      player.playVideoAt(
        currentIndex
      );

    } catch (error) {

      try {

        player.loadPlaylist(
          {
            listType:
              "playlist",

            list:
              PLAYLIST_ID,

            index:
              currentIndex
          }
        );

      } catch (inner) {}
    }


    renderPlaylist();

    return;
  }


  try {

    player.nextVideo();

  } catch (error) {}
}


// ============================================================
// SEEK ±10 SECONDS
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


    let target;


    if (
      duration > 0
    ) {

      target =
        Math.max(
          0,
          Math.min(
            duration,
            current +
              seconds
          )
        );

    } else {

      target =
        Math.max(
          0,
          current +
            seconds
        );
    }


    player.seekTo(
      target,
      true
    );


    updateProgress();

  } catch (error) {

    console.log(
      "Seek error:",
      error
    );
  }
}


// ============================================================
// PROGRESS BAR
// ============================================================

function updateProgress() {

  if (
    !player ||
    !playerReady ||
    !progressBar ||
    seeking
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


    progressBar.max =
      duration ||
      100;


    progressBar.value =
      Math.min(
        current,
        duration ||
          100
      );


    if (
      currentTimeText
    ) {

      currentTimeText.textContent =
        formatTime(
          current
        );
    }


    if (
      durationText
    ) {

      durationText.textContent =
        formatTime(
          duration
        );
    }

  } catch (error) {}
}


// ============================================================
// PROGRESS TIMER
// ============================================================

function startProgressTimer() {

  if (
    progressTimer
  ) {

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
// BUTTON STYLE
// ============================================================

function buttonStyle() {

  return [
    "border:0",
    "background:transparent",
    "color:rgba(255,255,255,.72)",
    "font-size:10px",
    "padding:2px 3px",
    "cursor:pointer",
    "white-space:nowrap"
  ].join(";");
}


// ============================================================
// TIME LABEL STYLE
// ============================================================

function timeStyle() {

  return [
    "color:rgba(255,255,255,.55)",
    "font-size:9px",
    "min-width:28px",
    "text-align:center"
  ].join(";");
}


// ============================================================
// BUILD CUSTOM PLAYER CONTROLS
// ============================================================

function buildPlayerControls() {

  if (
    controlsBuilt
  ) {
    return;
  }


  const info =
    document.querySelector(
      ".pb-info"
    );


  const controls =
    document.querySelector(
      ".pb-controls"
    );


  if (
    !info ||
    !controls
  ) {
    return;
  }


  // ----------------------------------------------------------
  // PROGRESS ROW
  // ----------------------------------------------------------

  const row =
    document.createElement(
      "div"
    );


  row.id =
    "memsahab-progress-row";


  row.style.cssText = [
    "width:100%",
    "display:flex",
    "align-items:center",
    "gap:5px",
    "margin-top:5px",
    "box-sizing:border-box"
  ].join(";");


  // Back 10

  const back =
    document.createElement(
      "button"
    );


  back.type =
    "button";


  back.textContent =
    "↶10";


  back.title =
    "Back 10 seconds";


  back.style.cssText =
    buttonStyle();


  back.addEventListener(
    "click",
    function (event) {

      event.stopPropagation();

      seekBy(-10);
    }
  );


  // Current time

  currentTimeText =
    document.createElement(
      "span"
    );


  currentTimeText.textContent =
    "0:00";


  currentTimeText.style.cssText =
    timeStyle();


  // Progress range

  progressBar =
    document.createElement(
      "input"
    );


  progressBar.type =
    "range";


  progressBar.min =
    "0";


  progressBar.max =
    "100";


  progressBar.value =
    "0";


  progressBar.step =
    "0.1";


  progressBar.id =
    "memsahab-progress";


  progressBar.style.cssText = [
    "flex:1",
    "min-width:40px",
    "height:3px",
    "cursor:pointer",
    "accent-color:#ffd98a"
  ].join(";");


  progressBar.addEventListener(
    "pointerdown",
    function () {

      seeking =
        true;
    }
  );


  progressBar.addEventListener(
    "input",
    function () {

      seeking =
        true;


      if (
        currentTimeText
      ) {

        currentTimeText.textContent =
          formatTime(
            Number(
              this.value
            )
          );
      }
    }
  );


  progressBar.addEventListener(
    "change",
    function () {

      if (
        player &&
        playerReady
      ) {

        try {

          player.seekTo(
            Number(
              this.value
            ),
            true
          );

        } catch (error) {}
      }


      seeking =
        false;


      updateProgress();
    }
  );


  progressBar.addEventListener(
    "pointerup",
    function () {

      seeking =
        false;
    }
  );


  // Duration

  durationText =
    document.createElement(
      "span"
    );


  durationText.textContent =
    "0:00";


  durationText.style.cssText =
    timeStyle();


  // Forward 10

  const forward =
    document.createElement(
      "button"
    );


  forward.type =
    "button";


  forward.textContent =
    "10↷";


  forward.title =
    "Forward 10 seconds";


  forward.style.cssText =
    buttonStyle();


  forward.addEventListener(
    "click",
    function (event) {

      event.stopPropagation();

      seekBy(10);
    }
  );


  row.append(
    back,
    currentTimeText,
    progressBar,
    durationText,
    forward
  );


  info.appendChild(
    row
  );


  // ----------------------------------------------------------
  // LIST BUTTON
  // ----------------------------------------------------------

  listButton =
    document.createElement(
      "button"
    );


  listButton.type =
    "button";


  listButton.id =
    "memsahab-list-button";


  listButton.textContent =
    "☰ List";


  listButton.title =
    "View playlist";


  listButton.style.cssText = [
    "height:34px",
    "padding:0 11px",
    "border-radius:18px",
    "border:1px solid rgba(255,255,255,.15)",
    "background:rgba(255,255,255,.08)",
    "color:white",
    "cursor:pointer",
    "font-size:11px",
    "white-space:nowrap",
    "margin-right:5px"
  ].join(";");


  listButton.addEventListener(
    "click",
    function (event) {

      event.stopPropagation();

      togglePlaylist();
    }
  );


  controls.insertBefore(
    listButton,
    controls.firstChild
  );


  controlsBuilt =
    true;


  createPlaylistPanel();
}


// ============================================================
// CREATE PLAYLIST PANEL
// ============================================================

function createPlaylistPanel() {

  if (
    listPanel
  ) {
    return;
  }


  listPanel =
    document.createElement(
      "div"
    );


  listPanel.id =
    "memsahab-playlist-panel";


  listPanel.style.cssText = [
    "position:fixed",
    "left:50%",
    "bottom:105px",
    "transform:translateX(-50%)",
    "width:min(430px,calc(100% - 24px))",
    "max-height:55vh",
    "overflow-y:auto",
    "background:rgba(14,10,24,.97)",
    "border:1px solid rgba(255,255,255,.14)",
    "border-radius:20px",
    "padding:12px",
    "box-sizing:border-box",
    "box-shadow:0 20px 60px rgba(0,0,0,.55)",
    "backdrop-filter:blur(20px)",
    "-webkit-backdrop-filter:blur(20px)",
    "z-index:99999",
    "display:none"
  ].join(";");


  // Header

  const header =
    document.createElement(
      "div"
    );


  header.style.cssText = [
    "display:flex",
    "justify-content:space-between",
    "align-items:center",
    "padding:4px 5px 10px",
    "color:white",
    "font-size:13px",
    "font-weight:600",
    "position:sticky",
    "top:0",
    "background:rgba(14,10,24,.97)",
    "z-index:2"
  ].join(";");


  const title =
    document.createElement(
      "span"
    );


  title.textContent =
    "❤️ Heer Memsahab";


  const close =
    document.createElement(
      "button"
    );


  close.type =
    "button";


  close.textContent =
    "×";


  close.title =
    "Close playlist";


  close.style.cssText = [
    "border:0",
    "background:transparent",
    "color:white",
    "font-size:22px",
    "cursor:pointer",
    "padding:0 5px"
  ].join(";");


  close.addEventListener(
    "click",
    function () {

      listPanel.style.display =
        "none";
    }
  );


  header.append(
    title,
    close
  );


  listPanel.appendChild(
    header
  );


  // Loading message

  const status =
    document.createElement(
      "div"
    );


  status.id =
    "memsahab-list-status";


  status.textContent =
    "Loading playlist…";


  status.style.cssText = [
    "color:rgba(255,255,255,.55)",
    "font-size:11px",
    "padding:10px 6px"
  ].join(";");


  listPanel.appendChild(
    status
  );


  document.body.appendChild(
    listPanel
  );
}


// ============================================================
// TOGGLE PLAYLIST
// ============================================================

function togglePlaylist() {

  if (!listPanel) {

    createPlaylistPanel();
  }


  const show =
    listPanel.style.display ===
    "none";


  listPanel.style.display =
    show
      ? "block"
      : "none";


  if (show) {

    populatePlaylist();
  }
}


// ============================================================
// POPULATE PLAYLIST
// ============================================================

function populatePlaylist() {

  if (
    !listPanel ||
    !player ||
    !playerReady
  ) {
    return;
  }


  let ids = [];


  try {

    ids =
      player.getPlaylist
        ? (
            player.getPlaylist() ||
            []
          )
        : [];

  } catch (error) {

    ids = [];
  }


  if (
    ids.length
  ) {

    playlistIds =
      ids.slice();


    renderPlaylist();

    return;
  }


  const status =
    document.getElementById(
      "memsahab-list-status"
    );


  if (status) {

    status.textContent =
      "YouTube is still loading the playlist…";
  }


  let tries = 0;


  const retry =
    setInterval(
      function () {

        tries++;


        try {

          ids =
            player.getPlaylist
              ? (
                  player.getPlaylist() ||
                  []
                )
              : [];

        } catch (error) {

          ids = [];
        }


        if (
          ids.length
        ) {

          clearInterval(
            retry
          );


          playlistIds =
            ids.slice();


          renderPlaylist();


          return;
        }


        if (
          tries >= 10
        ) {

          clearInterval(
            retry
          );


          if (status) {

            status.textContent =
              "Playlist could not be read yet. Close and tap List again.";
          }
        }

      },
      500
    );
}


// ============================================================
// RENDER PLAYLIST
// ============================================================

function renderPlaylist() {

  if (!listPanel) {
    return;
  }


  const status =
    document.getElementById(
      "memsahab-list-status"
    );


  if (status) {
    status.remove();
  }


  const old =
    listPanel.querySelectorAll(
      ".memsahab-song-item"
    );


  old.forEach(
    function (item) {

      item.remove();
    }
  );


  if (
    !playlistIds.length
  ) {

    const empty =
      document.createElement(
        "div"
      );


    empty.textContent =
      "No playlist songs loaded yet.";


    empty.style.cssText =
      "color:rgba(255,255,255,.55);font-size:11px;padding:10px 6px;";


    listPanel.appendChild(
      empty
    );


    return;
  }


  playlistIds.forEach(
    function (
      videoId,
      index
    ) {

      const item =
        document.createElement(
          "button"
        );


      item.type =
        "button";


      item.className =
        "memsahab-song-item";


      item.style.cssText = [
        "width:100%",
        "display:flex",
        "align-items:center",
        "gap:10px",
        "text-align:left",
        "border:0",
        "border-radius:12px",
        "padding:9px",
        "margin:2px 0",
        "background:" +
          (
            index ===
            currentIndex
              ? "rgba(255,217,138,.14)"
              : "transparent"
          ),
        "color:white",
        "cursor:pointer",
        "box-sizing:border-box"
      ].join(";");


      // Number

      const number =
        document.createElement(
          "span"
        );


      number.textContent =
        String(
          index + 1
        ).padStart(
          2,
          "0"
        );


      number.style.cssText =
        "width:28px;color:#ffd98a;font-size:9px;font-weight:700;";


      // Text wrapper

      const text =
        document.createElement(
          "span"
        );


      text.style.cssText =
        "min-width:0;display:block;flex:1;";


      // Title

      const title =
        document.createElement(
          "span"
        );


      title.className =
        "memsahab-song-title";


      title.textContent =
        "Song " +
        String(
          index + 1
        ).padStart(
          2,
          "0"
        );


      title.style.cssText =
        "display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px;font-weight:600;";


      // Video ID

      const idText =
        document.createElement(
          "span"
        );


      idText.textContent =
        videoId;


      idText.style.cssText =
        "display:block;color:rgba(255,255,255,.35);font-size:8px;margin-top:2px;";


      text.append(
        title,
        idText
      );


      item.append(
        number,
        text
      );


      // Hover

      item.addEventListener(
        "mouseenter",
        function () {

          if (
            index !==
            currentIndex
          ) {

            item.style.background =
              "rgba(255,255,255,.08)";
          }
        }
      );


      item.addEventListener(
        "mouseleave",
        function () {

          if (
            index !==
            currentIndex
          ) {

            item.style.background =
              "transparent";
          }
        }
      );


      // Select song

      item.addEventListener(
        "click",
        function () {

          currentIndex =
            index;


          try {

            player.playVideoAt(
              index
            );

          } catch (error) {

            try {

              player.loadPlaylist(
                {
                  listType:
                    "playlist",

                  list:
                    PLAYLIST_ID,

                  index:
                    index
                }
              );

            } catch (inner) {

              console.log(
                "Could not select playlist song:",
                inner
              );
            }
          }


          listPanel.style.display =
            "none";


          renderPlaylist();
        }
      );


      listPanel.appendChild(
        item
      );


      // Get YouTube title.

      fetch(
        "https://www.youtube.com/oembed?url=" +
          encodeURIComponent(
            "https://www.youtube.com/watch?v=" +
            videoId
          ) +
          "&format=json"
      )

        .then(
          function (
            response
          ) {

            if (
              !response.ok
            ) {

              throw new Error(
                "oEmbed request failed"
              );
            }


            return response.json();
          }
        )

        .then(
          function (
            data
          ) {

            title.textContent =
              data.title ||
              (
                "Song " +
                (
                  index + 1
                )
              );
          }
        )

        .catch(
          function () {

            // Keep fallback title.
          }
        );
    }
  );
}


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


  if (
    !timeEl ||
    !ampmEl ||
    !dateEl
  ) {
    return;
  }


  function tick() {

    const now =
      new Date();


    let hours =
      now.getHours();


    const ampm =
      hours >= 12
        ? "PM"
        : "AM";


    hours =
      hours % 12 ||
      12;


    const minutes =
      String(
        now.getMinutes()
      ).padStart(
        2,
        "0"
      );


    timeEl.textContent =
      hours +
      ":" +
      minutes;


    ampmEl.textContent =
      ampm;


    dateEl.textContent =
      now.toLocaleDateString(
        "en-GB",
        {
          weekday:
            "short",

          day:
            "numeric",

          month:
            "short"
        }
      );
  }


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

  if (
    code === 0
  ) {
    return "☀️";
  }


  if (
    code <= 2
  ) {
    return "⛅";
  }


  if (
    code === 3 ||
    code === 45 ||
    code === 48
  ) {
    return "☁️";
  }


  if (
    code <= 67
  ) {
    return "🌧️";
  }


  if (
    code <= 77
  ) {
    return "🌨️";
  }


  if (
    code <= 82
  ) {
    return "🌦️";
  }


  if (
    code <= 86
  ) {
    return "🌨️";
  }


  return "⛈️";
}


// ============================================================
// FETCH WEATHER
// ============================================================

async function fetchWeather(
  lat,
  lon,
  el
) {

  if (!el) {
    return;
  }


  try {

    const response =
      await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=" +
          lat +
          "&longitude=" +
          lon +
          "&current=temperature_2m,weather_code"
      );


    if (
      !response.ok
    ) {

      throw new Error(
        "Weather request failed"
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

  } catch (error) {

    el.textContent =
      "🌙";
  }
}


// ============================================================
// WEATHER INIT
// ============================================================

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


  let index = 0;


  function tryNext() {

    if (
      index >=
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
      candidates[
        index++
      ];
  }


  tryNext();
}


// ============================================================
// YOUTUBE API CALLBACK
// ============================================================

function onYouTubeIframeAPIReady() {

  initPlayer(
    false
  );
}


window.onYouTubeIframeAPIReady =
  onYouTubeIframeAPIReady;


// ============================================================
// BUTTON WIRING
// ============================================================

if (
  els.playBtn
) {

  els.playBtn.addEventListener(
    "click",
    togglePlay
  );
}


if (
  els.heartBtn
) {

  els.heartBtn.addEventListener(
    "click",
    togglePlay
  );
}


if (
  els.prevBtn
) {

  els.prevBtn.addEventListener(
    "click",
    previousSong
  );
}


if (
  els.nextBtn
) {

  els.nextBtn.addEventListener(
    "click",
    nextSong
  );
}


// ============================================================
// START PAGE FEATURES
// ============================================================

updateDayBadge();

checkBackground();

startClock();

initWeather();


// ============================================================
// HANDLE API ALREADY LOADED
// ============================================================

if (
  window.YT &&
  window.YT.Player
) {

  initPlayer(
    false
  );
}


// ============================================================
// WAIT FOR PLAYER BAR / DOM
// ============================================================

window.addEventListener(
  "load",
  function () {

    buildPlayerControls();


    let attempts = 0;


    const timer =
      setInterval(
        function () {

          attempts++;


          buildPlayerControls();


          if (
            controlsBuilt ||
            attempts >= 20
          ) {

            clearInterval(
              timer
            );
          }

        },
        500
      );
  }
);
