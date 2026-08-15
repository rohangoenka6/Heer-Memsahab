// ============================================================
//  Song list (add one new song here every day)
//
//  HOW TO ADD A SONG (super simple):
//  1. Copy everything between the { } curly braces of a song.
//  2. Paste it after the last song, before the closing ] bracket.
//  3. Change the words inside " " (quotes) to your song's details.
//  4. Put your song's YouTube link inside youtube: "..."
//  5. Done! No coding needed. The site updates itself.
//
//  To find a YouTube link: open the video on YouTube → click Share
//  → Copy link → it looks like  https://www.youtube.com/watch?v=ABC123
//
//  START_DATE = the day you launch the site (Year, Month, Day).
//  The site will open on the song for "today" since that date.
// ============================================================

const START_DATE = new Date(2026, 7, 16); // e.g. new Date(2026, 7, 16) = 16 August 2026 (month is 0-based!)

const SONGS = [
  {
    day: 1,
    song: "Tum Se Hi",
    artist: "Mohit Chauhan",
    note: "The one I chose because — it reminded me of you.",
    youtube: "https://www.youtube.com/watch?v=5dxLyQig614",
  },
  {
    day: 2,
    song: "Tum Hi Ho",
    artist: "Arijit Singh",
    note: "Today's song — I don't know why, but this sounded like us.",
    youtube: "https://www.youtube.com/watch?v=JF8iJk3L6LA",
  },
  {
    day: 3,
    song: "Agar Tum Saath Ho",
    artist: "Alka Yagnik & Arijit Singh",
    note: "You probably won't know why I added this one. Maybe someday.",
    youtube: "https://www.youtube.com/watch?v=4fONHArPPsI",
  },
];
