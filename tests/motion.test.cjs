const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Flock = require('../assets/js/flock.js');
function setup(reducedMotion) {
    const listeners = new Map(), elements = new Map(), frames = new Map(); let nextFrame = 0;
    function element(id) {
        if (!elements.has(id)) elements.set(id, { value: '', max: id === 'selfControl' ? '5' : '', textContent: '', style: {}, hidden: id === 'hiddenControl',
            classList: { toggle() {}, remove() {} }, setAttribute(name, value) { this[name] = value; },
            addEventListener(name, callback) { this[name] = callback; }, append() {}, checkValidity: () => true,
            getContext: () => new Proxy({}, { get: () => () => {} }) });
        return elements.get(id);
    }
    const preference = { matches: reducedMotion, addEventListener(name, callback) { this.change = callback; } };
    const document = { hidden: false, documentElement: {},
        addEventListener(name, callback) { listeners.set(name, callback); },
        getElementById: element, querySelectorAll: () => [], createElement: () => ({}) };
    const window = { addEventListener() {} };
    const context = { Flock, document, window, matchMedia: () => preference,
        innerWidth: 390, innerHeight: 844, devicePixelRatio: 1,
        getComputedStyle: () => ({ getPropertyValue: () => 'sans-serif' }),
        requestAnimationFrame: callback => { frames.set(++nextFrame, callback); return nextFrame; },
        cancelAnimationFrame: id => frames.delete(id) };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync('assets/js/main.js', 'utf8') + '\ninitFlockingSimulation();', context);
    return { element, preference, document, listeners, frames, window };
}
test('reduced motion starts paused and requires explicit resume', () => {
    const env = setup(true);
    assert.equal(env.frames.size, 0);
    assert.match(env.element('simulation-status').textContent, /Reduced motion/);
    env.element('pause-simulation').click(); assert.equal(env.frames.size, 1);
    env.element('pause-simulation').click(); assert.equal(env.frames.size, 0);
});
test('visibility and lightbox suspend animation without losing a user pause', () => {
    const env = setup(false); assert.equal(env.frames.size, 1);
    env.document.hidden = true; env.listeners.get('visibilitychange')(); assert.equal(env.frames.size, 0);
    env.document.hidden = false; env.listeners.get('visibilitychange')(); assert.equal(env.frames.size, 1);
    env.listeners.get('lightboxchange')({ detail: { open: true } }); assert.equal(env.frames.size, 0);
    env.listeners.get('lightboxchange')({ detail: { open: false } }); assert.equal(env.frames.size, 1);
    env.element('pause-simulation').click();
    env.listeners.get('lightboxchange')({ detail: { open: true } });
    env.listeners.get('lightboxchange')({ detail: { open: false } }); assert.equal(env.frames.size, 0);
});
test('enabling reduced motion cancels an active animation; disabling it does not auto-resume', () => {
    const env = setup(false);
    env.preference.matches = true; env.preference.change({ matches: true }); assert.equal(env.frames.size, 0);
    env.preference.matches = false; env.preference.change({ matches: false }); assert.equal(env.frames.size, 0);
});

test('only maximum Self control unlocks manual flight and lowering it releases the bird', () => {
    const env = setup(false), hidden = env.element('hiddenControl'), slider = env.element('selfControl');
    assert.equal(hidden.hidden, true);
    for (let i = 0; i < 3; i++) env.element('youAreHereButton').click();
    assert.equal(hidden.hidden, true, 'You Are Here no longer unlocks the easter egg');
    slider.value = '4.9'; slider.input(); assert.equal(hidden.hidden, true);
    slider.value = '5'; slider.input(); assert.equal(hidden.hidden, false);
    env.element('manualControlButton').click(); assert.equal(env.element('manualControlButton')['aria-pressed'], 'true');
    slider.value = '4.9'; slider.input(); assert.equal(hidden.hidden, true);
    assert.equal(env.element('manualControlButton')['aria-pressed'], 'false');
    env.element('manualControlButton').click(); assert.equal(env.element('manualControlButton')['aria-pressed'], 'false');
});
