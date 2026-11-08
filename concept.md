# Gongfu: concept

Status: agreed by Chris 2026-11-08 ("sure, build it"). First version built the same day.

## What it is

A brewing companion for the iPad by the kettle. During a gongfu session it shows one thing: what
to do now. After each steep you tap how it tasted, and the app sets the next steep from that tap.
It remembers every session, so the next time you brew a tea it starts from what you learned last
time, and it tells you which tea to try next.

## Who it's for

Chris, as a beginner learning gongfu with the kit he owns. It replaces the "what do I do
tomorrow" guidance he has been getting from a chat session.

- Pot: HEER travel set, a small handled pot with a built-in filter. Usable volume ~90–100 ml, one
  cup, no pitcher, so each steep must fit the cup.
- Kettle with a temperature setting and keep-warm. Temperatures are shown in °F.
- No scale. Leaf is measured in heaping teaspoons.
- Tea: the VAHDAM sampler's gongfu-suitable six (High Mountain Darjeeling Oolong, Imperial
  Himalayan White, Himalayan Green, Darjeeling FF, Darjeeling SF, Assam SF), each with a starting
  temperature and steep schedule.

## The core screen

Big type, readable from a step away:

    Steep 3 · 195 °F
    Pour now. 35 s.

- **Setup** comes first, as single steps in the same style: set the kettle, preheat the pot, add
  N teaspoons, optional rinse.
- **The timer** runs on screen and chimes when it's time to pour off. The screen stays awake.
- **After each steep** there are three buttons: weak, good, bitter. Bitter makes the next steep
  shorter, weak makes it longer, and good keeps the schedule. The exact amounts get tuned once
  it's in use.
- **The session row** is a line of small cups along the bottom, one per steep. Each cup's fill
  colour is that steep's tap, running from pale (weak) through full (good) to dark (bitter), so the
  whole session reads at a glance. The cups encode nothing else.

## What it remembers

- Every session: the tea, teaspoons used, each steep's time, temperature and tap.
- What a tea's session opens with: if its last session went bitter or weak, the start says so
  ("last time steep 4 went bitter, so starting 5 s shorter") and the schedule is already adjusted.
- What to try next: an order through the six teas, starting from where he is (oolong done; next
  Darjeeling SF, then FF at 185 °F).
- Data stays on the iPad (localStorage). No account, no sync.

## Deliberately out

- Western-style brewing, matcha, chai and the herbal blends in the sampler.
- Tasting notes, flavour wheels, scores, and anything else that turns into a spreadsheet.
- Leaves unfurling, 3D, and decorative illustration. The visuals are only steep count, time,
  temperature and taste.
- The Pixel and the phone layout. It's built for the iPad on the counter.
- A tea catalogue, shopping, reminders and social features.

## If it gets built

A vanilla HTML/JS PWA like Simmer, on GitHub Pages, working offline. Registering it means a
PROJECTS.md line on a `claude/*` branch in automation (tier1, Chris merges).
