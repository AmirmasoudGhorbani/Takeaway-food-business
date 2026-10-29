const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/hero.js'), 'utf8');
function setup({ frameCallback = true, reduced = false, dataSaver = false, readyState = 4 } = {}) {
  const events = {}, windowEvents = {}, frames = [], seeks = [];
  let position = 0, hidden = false, frame, scroll = 0, ready = readyState;
  const video = {
    get readyState() { return ready; },
    get duration() { return ready >= 1 ? 14 : NaN; },
    error: null, dataset: { src: 'desktop.mp4', srcPortrait: 'mobile.mp4' },
    removeAttribute() {}, pause() {}, addEventListener(name, fn) { events[name] = fn; },
    get currentTime() { return position; }, set currentTime(value) { position = value; seeks.push(value); },
    ...(frameCallback ? { requestVideoFrameCallback(fn) { frame = fn; } } : {})
  };
  const poster = { classList: { add() { hidden = true; }, remove() { hidden = false; } } };
  const hero = { querySelectorAll: () => [], getBoundingClientRect: () => ({ top: -scroll, height: 2000 }) };
  vm.runInNewContext(source, {
    document: { getElementById: id => ({ hero, 'hero-video': video, 'hero-poster': poster, 'hero-scroll-track': hero })[id] },
    window: { matchMedia: q => ({ matches: q.includes('reduced-motion') && reduced }), addEventListener: (name, fn) => { windowEvents[name] = fn; } },
    navigator: { connection: { saveData: dataSaver } }, requestAnimationFrame: fn => { frames.push(fn); return frames.length; }
  });
  return { video, seeks, events, windowEvents, present: () => frame(), hidden: () => hidden, scroll: n => { scroll = n; },
           setReadyState: n => { ready = n; }, tick: () => frames.splice(0).forEach(fn => fn()) };
}
test('prepares frame before any scroll and waits for seek plus presentation', () => {
  const h = setup(); assert.deepEqual(h.seeks, [0.001]); assert.equal(h.hidden(), false);
  h.events.seeked(); assert.equal(h.hidden(), false);
  h.present(); assert.equal(h.hidden(), true); assert.equal(typeof h.windowEvents.scroll, 'function');
  h.scroll(500); h.windowEvents.scroll(); h.tick(); assert(h.seeks.at(-1) > 0.001);
});
test('presentation arriving before seek completion does not enable early', () => {
  const h = setup(); h.present(); assert.equal(h.hidden(), false); h.events.seeked(); assert.equal(h.hidden(), true);
});
test('older browsers wait two paint opportunities after initial seek', () => {
  const h = setup({frameCallback:false}); h.events.seeked(); h.tick(); assert.equal(h.hidden(), false); h.tick(); assert.equal(h.hidden(), true);
});
test('early scrolling catches up after startup', () => {
  const h = setup(); h.scroll(700); h.events.seeked(); h.present(); h.tick(); assert(h.seeks.at(-1) > 1);
});
test('media failure keeps fallback visible despite late callbacks', () => {
  const h = setup(); h.video.error = {}; h.events.error(); h.events.seeked(); h.present(); assert.equal(h.hidden(), false);
});
for(const options of [{reduced:true},{dataSaver:true}]) test(`static fallback ${JSON.stringify(options)}`, () => {
  const h=setup(options); assert.equal(h.video.src,undefined); assert.equal(h.seeks.length,0); assert.equal(h.hidden(),false);
});

test('scrolling starts when frame-callback API exists but paused video never calls it', () => {
  const h = setup(); h.events.seeked(); h.tick(); h.tick();
  assert.equal(h.hidden(), true);
  assert.equal(typeof h.windowEvents.scroll, 'function');
  h.scroll(500); h.windowEvents.scroll(); h.tick();
  assert(h.seeks.at(-1) > 0.001);
});

// iOS withholds media data until playback begins: `preload` is advisory, so
// `loadeddata`, readyState 2 and a presented frame can all be missing for the
// whole visit. Metadata and seeking are the only things an iPhone reliably
// gives us, so those alone have to be enough to turn the hero.
test('iPhone: scroll turns the hero on metadata alone, with no decoded data', () => {
  const h = setup({ readyState: 1 });
  h.events.seeked();
  assert.equal(h.hidden(), false, 'poster stays up while nothing is drawable');
  assert.equal(typeof h.windowEvents.scroll, 'function', 'scroll must be live');
  h.scroll(900); h.windowEvents.scroll(); h.tick();
  assert(h.seeks.at(-1) > 0.001, 'the clip has to follow scroll');
});
test('iPhone: startup waits for metadata, never for decoded data', () => {
  const h = setup({ readyState: 0 });
  assert.equal(h.windowEvents.scroll, undefined, 'nothing to scrub before metadata');
  h.setReadyState(1); h.events.loadedmetadata();
  assert.equal(typeof h.windowEvents.scroll, 'function');
  h.events.seeked(); h.scroll(600); h.windowEvents.scroll(); h.tick();
  assert(h.seeks.at(-1) > 0.001);
});
test('iPhone: poster hands off when decoded data finally shows up', () => {
  const h = setup({ readyState: 1 });
  h.events.seeked(); assert.equal(h.hidden(), false);
  h.setReadyState(2); h.events.canplay(); h.tick(); h.tick();
  assert.equal(h.hidden(), true);
});
test('a failed video is never seeked again, though the page still scrolls', () => {
  const h = setup();
  h.events.seeked(); h.present();
  const seeksBefore = h.seeks.length;
  h.video.error = {}; h.events.error();
  h.scroll(800); h.windowEvents.scroll(); h.tick(); h.tick();
  assert.equal(h.seeks.length, seeksBefore, 'no seeks attempted on a failed video');
  assert.equal(typeof h.windowEvents.scroll, 'function', 'scrolling itself stays untouched');
});
test('scrolling is never gated behind a presented video frame', () => {
  const h = setup();
  assert.equal(typeof h.windowEvents.scroll, 'function');
  assert.equal(h.hidden(), false);
});
