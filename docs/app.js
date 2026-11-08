'use strict';

// Starting guesses for a ~95 ml pot, leaf in heaping teaspoons (no scale). Taste taps tune them per tea.
const TEAS = [
  { id: 'darj-sf', name: 'Darjeeling Second Flush', temp: 195, tsp: 3, steeps: [15, 20, 30, 45, 70, 120] },
  { id: 'darj-ff', name: 'Darjeeling First Flush', temp: 185, tsp: 3, steeps: [15, 20, 30, 45, 70, 120] },
  { id: 'him-green', name: 'Himalayan Green', temp: 175, tsp: 3, steeps: [15, 20, 30, 45, 60, 90] },
  { id: 'him-white', name: 'Imperial Himalayan White', temp: 185, tsp: 4, steeps: [25, 30, 40, 55, 75, 120] },
  { id: 'assam', name: 'Assam Exotic Second Flush', temp: 205, tsp: 2, steeps: [10, 15, 20, 30, 45, 75] },
  // Brewed once before the app existed, so it comes last in the suggested order.
  { id: 'oolong', name: 'High Mountain Darjeeling Oolong', temp: 195, tsp: 2, steeps: [20, 25, 35, 50, 75, 120] },
];

// How much one taste tap changes the next steep (and that steep next time). Tune once in use.
const ADJUST = { weak: 1.3, good: 1, bitter: 0.8 };
const KEY = 'gongfu.v1';

const SETUP = [
  { action: tea => `Set the kettle to ${tea.temp}&nbsp;°F.`, sub: 'Wait until it reaches temperature.', done: 'Done' },
  { action: () => 'Warm the pot and cup.', sub: 'Fill both with hot water, then pour it out.', done: 'Done' },
  { action: () => 'Add the leaf.', leaf: true, done: 'Done' },
  { action: () => 'Rinse the leaf?', sub: 'Fill the pot and pour it off straight away. Optional.', done: 'Rinsed', skip: 'Skip' },
];

// ---- State ----

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    if (data && Array.isArray(data.sessions)) return data;
  } catch (e) {}
  return { sessions: [], active: null };
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
}
let state = load();

const teaById = id => TEAS.find(t => t.id === id);
const round5 = s => Math.max(5, Math.round(s / 5) * 5);
const shortDate = ts => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

function lastSession(teaId) {
  for (let i = state.sessions.length - 1; i >= 0; i--) if (state.sessions[i].tea === teaId) return state.sessions[i];
  return null;
}
function sessionCount(teaId) {
  return state.sessions.filter(s => s.tea === teaId).length;
}
function tspFor(teaId) {
  const last = lastSession(teaId);
  return last ? last.tsp : teaById(teaId).tsp;
}

// Starting guess for steep i, extended past the schedule by half again each steep.
function baseAt(tea, i) {
  const s = tea.steeps;
  if (i < s.length) return s[i];
  return Math.min(600, round5(s[s.length - 1] * 1.5 ** (i - s.length + 1)));
}

// This session's plan for steep i: last time's time nudged by how it tasted. Steeps beyond last
// time's count scale the starting guess by how far last time's steeps moved from it overall, so one
// odd steep (an early pour-off) can't drag the rest.
function plannedTime(teaId, i) {
  const tea = teaById(teaId), last = lastSession(teaId);
  if (!last) return baseAt(tea, i);
  const learned = last.steeps.map(s => round5(s.t * ADJUST[s.tap]));
  if (i < learned.length) return learned[i];
  const learnedSum = learned.reduce((sum, t) => sum + t, 0);
  const baseSum = learned.reduce((sum, t, k) => sum + baseAt(tea, k), 0);
  return round5(baseAt(tea, i) * learnedSum / baseSum);
}

function lastTimeNote(teaId) {
  const last = lastSession(teaId);
  if (!last) return 'First time with this tea. The times are a starting guess; your taps after each steep tune them.';
  const when = shortDate(last.startedAt);
  const off = last.steeps.map((s, i) => ({ ...s, i })).filter(s => s.tap !== 'good');
  if (!off.length) return `Last time (${when}) every steep was good, so the times stay the same.`;
  const parts = off.slice(0, 2).map(s => `steep ${s.i + 1} was ${s.tap}, so it's ${plannedTime(teaId, s.i)} s now (was ${s.t} s)`);
  let text = `Last time (${when}) ${parts.join('; ')}.`;
  const more = off.length - 2;
  if (more > 0) text += ` ${more} more steep${more > 1 ? 's' : ''} adjusted too.`;
  return text;
}

// First tea not yet brewed in the app; once all have been, the one brewed longest ago.
function nextTea() {
  const untried = TEAS.find(t => !lastSession(t.id));
  if (untried) return untried;
  return TEAS.slice().sort((a, b) => lastSession(a.id).startedAt - lastSession(b.id).startedAt)[0];
}

// ---- Session ----

function start(teaId) {
  state.active = { tea: teaId, startedAt: Date.now(), tsp: tspFor(teaId), phase: 'setup', setup: 0, factor: 1, lastTap: null, steeps: [], timer: null };
  save();
}
function currentTime(a) {
  return round5(plannedTime(a.tea, a.steeps.length) * a.factor);
}
function finish() {
  const a = state.active;
  if (a.steeps.length) state.sessions.push({ tea: a.tea, startedAt: a.startedAt, tsp: a.tsp, steeps: a.steeps });
  state.active = null;
  save();
  letSleep();
}

function onAction(el) {
  const a = state.active;
  const act = el.dataset.act;
  if (act === 'start-session') { unlockAudio(); start(el.dataset.tea); keepAwake(); }
  else if (!a) return;
  else if (act === 'setup-done') { a.setup++; if (a.setup >= SETUP.length) a.phase = 'ready'; }
  else if (act === 'tsp') { a.tsp = Math.max(1, a.tsp + Number(el.dataset.d)); }
  else if (act === 'steep') { unlockAudio(); a.timer = { start: Date.now(), dur: currentTime(a) }; a.phase = 'steeping'; }
  else if (act === 'stop-early') { a.timer.dur = Math.max(1, Math.round((Date.now() - a.timer.start) / 1000)); a.phase = 'taste'; }
  else if (act === 'tap') {
    a.steeps.push({ t: a.timer.dur, tap: el.dataset.tap });
    a.factor *= ADJUST[el.dataset.tap];
    a.lastTap = el.dataset.tap;
    a.timer = null;
    a.phase = 'ready';
  }
  else if (act === 'end') {
    if (a.phase === 'steeping' && !confirm('End the session? This steep won\'t be recorded.')) return;
    finish();
  }
  if (state.active) keepAwake();
  save();
  render();
}

// ---- Timer, chime, wake lock ----

function remaining(a) {
  return a.timer.dur - (Date.now() - a.timer.start) / 1000;
}
function tick() {
  const a = state.active;
  if (!a || a.phase !== 'steeping') return;
  const left = remaining(a);
  if (left <= 0) {
    // Only chime if we're close to the moment; a restored, long-finished steep just moves on.
    if (left > -30) chime();
    a.phase = 'taste';
    save();
    render();
    return;
  }
  const clock = document.querySelector('.clock');
  if (clock) clock.textContent = formatClock(Math.ceil(left));
}
setInterval(tick, 200);

function formatClock(s) {
  return s < 60 ? String(s) : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

let audio = null;
function unlockAudio() {
  // Safari only allows sound from a context created or resumed inside a tap.
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  } catch (e) {}
}
function chime() {
  if (!audio) return;
  const now = audio.currentTime;
  [0, 0.7, 1.4].forEach(delay => {
    [[880, 0.3], [1320, 0.1]].forEach(([freq, level]) => {
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + delay);
      gain.gain.exponentialRampToValueAtTime(level, now + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 1.5);
      osc.connect(gain).connect(audio.destination);
      osc.start(now + delay);
      osc.stop(now + delay + 1.6);
    });
  });
}

let lock = null;
async function keepAwake() {
  if (!state.active || lock || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => { lock = null; });
  } catch (e) {}
}
function letSleep() {
  if (lock) { lock.release(); lock = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { keepAwake(); tick(); }
});

// ---- Rendering ----

const cup = (tap, extra = '') => `<span class="cup ${tap || ''} ${extra}" title="${tap || ''}"></span>`;

function bar(teaName, endLabel) {
  return `<header class="bar"><span class="brand">Gongfu</span>${teaName ? `<span class="tea">${teaName}</span>` : ''}${endLabel ? `<button class="quiet end" data-act="end">${endLabel}</button>` : ''}</header>`;
}

function renderHome() {
  const next = nextTea();
  const others = TEAS.filter(t => t !== next).map(t => {
    const last = lastSession(t.id), n = sessionCount(t.id);
    const meta = `${t.temp}&nbsp;°F · ${tspFor(t.id)} tsp · ` + (last ? `${n} session${n > 1 ? 's' : ''}, last ${shortDate(last.startedAt)}` : 'not brewed yet');
    const cups = last ? `<span class="cups">${last.steeps.map(s => cup(s.tap)).join('')}</span>` : '';
    return `<li><button data-act="start-session" data-tea="${t.id}"><span class="name">${t.name}</span><span class="meta">${meta}</span>${cups}</button></li>`;
  }).join('');
  return bar() + `<main class="home">
    <div class="eyebrow">Next tea</div>
    <section class="next">
      <h1>${next.name}</h1>
      <p class="facts">${next.temp}&nbsp;°F · ${tspFor(next.id)} heaping tsp · first steep ${plannedTime(next.id, 0)} s</p>
      <p class="note">${lastTimeNote(next.id)}</p>
      <button class="primary" data-act="start-session" data-tea="${next.id}">Start</button>
    </section>
    <div class="eyebrow">Or brew another</div>
    <ul class="list">${others}</ul>
    <div class="legend">Each circle is one steep: <span>${cup('weak')} weak</span><span>${cup('good')} good</span><span>${cup('bitter')} bitter</span></div>
  </main>`;
}

function renderSession(a) {
  const tea = teaById(a.tea);
  const n = a.steeps.length + 1;
  let stage;
  if (a.phase === 'setup') {
    const step = SETUP[a.setup];
    const sub = step.leaf
      ? `<div class="stepper"><button data-act="tsp" data-d="-1" aria-label="Fewer">−</button>${a.tsp} heaping tsp<button data-act="tsp" data-d="1" aria-label="More">+</button></div>`
      : `<p class="sub">${step.sub}</p>`;
    stage = `<div class="step-label">Before the first steep · ${a.setup + 1} of ${SETUP.length}</div>
      <h1 class="action">${step.action(tea)}</h1>${sub}
      <div class="buttons">${step.skip ? `<button class="big" data-act="setup-done">${step.skip}</button>` : ''}<button class="primary big" data-act="setup-done">${step.done}</button></div>`;
  } else if (a.phase === 'ready') {
    const t = currentTime(a);
    let sub = '';
    if (a.lastTap === 'bitter') sub = 'The last one was bitter, so this one is shorter.';
    else if (a.lastTap === 'weak') sub = 'The last one was weak, so this one is longer.';
    if (n > tea.steeps.length) sub += (sub ? ' ' : '') + 'The leaf may be nearly spent: brew another, or finish.';
    stage = `<div class="step-label">Steep ${n} · ${tea.temp}&nbsp;°F</div>
      <h1 class="action">Fill the pot.</h1>${sub ? `<p class="sub">${sub}</p>` : ''}
      <div class="buttons"><button class="primary big" data-act="steep">Start · ${t} s</button></div>`;
  } else if (a.phase === 'steeping') {
    stage = `<div class="step-label">Steep ${n} · ${tea.temp}&nbsp;°F</div>
      <div class="clock">${formatClock(Math.ceil(Math.max(0, remaining(a))))}</div>
      <p class="sub">Pour off into the cup at the chime.</p>
      <div class="buttons"><button class="quiet" data-act="stop-early">Pour off now</button></div>`;
  } else {
    stage = `<div class="step-label">Steep ${n} · ${a.timer.dur} s</div>
      <h1 class="action">Pour off into the cup.</h1>
      <p class="sub">Then taste it. How was it?</p>
      <div class="buttons taste">${['weak', 'good', 'bitter'].map(tap => `<button class="${tap}" data-act="tap" data-tap="${tap}">${tap[0].toUpperCase() + tap.slice(1)}</button>`).join('')}</div>`;
  }
  const row = a.phase === 'setup' ? '' : a.steeps.map(s => cup(s.tap)).join('') + cup('', 'now');
  return bar(tea.name, a.steeps.length ? 'Finish' : 'Cancel') + `<main class="stage">${stage}</main><footer class="row">${row}</footer>`;
}

function render() {
  const a = state.active;
  document.getElementById('app').innerHTML = a ? renderSession(a) : renderHome();
}

document.getElementById('app').addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (el) onAction(el);
});

render();
tick();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
