# Gongfu

iPad gongfu tea-brewing companion PWA for Chris, a beginner, with his own kit (HEER travel pot,
~95 ml usable, one cup, temperature kettle, no scale) and his VAHDAM sampler's six gongfu teas.
It shows one next action at a time, adjusts each steep from a weak/good/bitter tap, and remembers
every session per tea. What it is and what's deliberately out: `concept.md` (agreed 2026-11-08).

## Layout

Everything served lives in `docs/`. No build step, no dependencies, no tests.

- `index.html`: a shell; `app.js` renders everything into `#app`.
- `app.js`: tea data (`TEAS`, starting guesses), the taste rule (`ADJUST`), session flow,
  timer, chime, wake lock, rendering.
- `sw.js`: network-first cache (`gongfu-v1`), for brewing offline. Bump the name when adding assets.
- `icon.svg` and `icon-180.png`: the PNG is for iOS's home screen, which ignores SVG touch icons.

## Run

Preview config `gongfu` in `C:/Users/Chris/claude/.claude/launch.json` (port 3011), or
`npx -y http-server docs -p 3011 -c-1`.

## How the times are worked out

- During a session, each tap multiplies the remaining steeps by `ADJUST[tap]`
  (weak 1.3, bitter 0.8; to be tuned once in use).
- Next session, steep i's time is last session's steep i nudged by its tap. Steeps past last
  time's count scale the starting guess by last time's steeps overall (sum against sum), so one
  odd steep can't drag the rest. That was a real bug in the first version: an early pour-off at
  3 s shrank every later steep to 5–10 s.
- `t` in a stored steep is the time actually steeped: the full timer, or the elapsed time if
  "Pour off now" was tapped.

## Data

localStorage key `gongfu.v1`: `{ sessions: [{tea, startedAt, tsp, steeps: [{t, tap}]}], active }`.
`active` is the session in progress, saved on every tap, so a reload resumes it. Per device and per
origin: changing the key or the app's URL strands the history. Safari may clear storage for a site
that isn't on the Home Screen after 7 days unused, so use it as a Home Screen app.

## Deploy and tier

Not deployed yet. Local git only (2026-11-08). Unlisted in `automation/tiers.json`, so tier1:
work on `claude/*` branches, and Chris merges.
