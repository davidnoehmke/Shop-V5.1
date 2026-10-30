import assert from 'node:assert/strict';
import {test} from 'node:test';
import {installScrollReveal} from '../app/lib/scroll-reveal.ts';

function fixture({reduced = false, supported = true} = {}) {
  let callback;
  let change;
  let disconnected = 0;
  let removed = 0;
  const animations = [];
  const watched = [];
  class MockNode {}
  class MockElement extends MockNode {
    constructor(top) { super(); this.top = top; }
    parentElement = null;
    getBoundingClientRect() { return {top: this.top}; }
    contains(node) { return this === node; }
    animate(frames, options) {
      const animation = {frames, options, cancelled: false,
        cancel() { this.cancelled = true; }, finished: new Promise(() => {})};
      animations.push(animation);
      return animation;
    }
  }
  const preference = {matches: reduced,
    addEventListener(_name, listener) {change = listener;},
    removeEventListener() {removed++;},
  };
  globalThis.Node = MockNode;
  globalThis.Element = MockElement;
  globalThis.document = {activeElement: null};
  globalThis.window = {innerHeight: 800, matchMedia: () => preference};
  class MockObserver {
    constructor(cb) {callback = cb;}
    observe(target) {watched.push(target);}
    unobserve() {}
    disconnect() {disconnected++;}
  }
  if (supported) window.IntersectionObserver = MockObserver;
  globalThis.IntersectionObserver = MockObserver;
  const hero = new MockElement(0);
  const below = new MockElement(1200);
  const nested = new MockElement(1300);
  nested.parentElement = {closest: () => below};
  const root = {
    querySelectorAll: () => [hero, below, nested],
    contains: (target) => [hero, below, nested].includes(target),
    addEventListener(_name, listener) {this.focus = listener;},
    removeEventListener() {removed++;},
  };
  return {root, hero, below, watched, animations,
    enter: (target) => callback([{isIntersecting:true, target}]),
    change: (matches) => {preference.matches = matches; change();},
    get disconnected() {return disconnected;},
    get removed() {return removed;},
  };
}

test('only below-fold outer content animates once and settles without fill styles', () => {
  const f = fixture();
  const cleanup = installScrollReveal(f.root);
  assert.deepEqual(f.watched, [f.below]);
  f.enter(f.below);
  f.enter(f.below);
  assert.equal(f.animations.length, 1);
  assert.equal(f.animations[0].options.duration, 900);
  assert.equal(f.animations[0].options.fill, undefined);
  cleanup();
  assert.ok(f.animations[0].cancelled);
  assert.equal(f.removed, 2);
});

test('reduced motion leaves everything visible without observing', () => {
  const f = fixture({reduced:true});
  const cleanup = installScrollReveal(f.root);
  assert.equal(f.watched.length, 0);
  assert.equal(f.animations.length, 0);
  cleanup();
});

test('changing motion preference cancels running animations', () => {
  const f = fixture();
  const cleanup = installScrollReveal(f.root);
  f.enter(f.below);
  f.change(true);
  assert.ok(f.animations[0].cancelled);
  assert.ok(f.disconnected > 0);
  cleanup();
});

test('keyboard focus cancels motion and focused content never animates', () => {
  const f = fixture();
  const cleanup = installScrollReveal(f.root);
  document.activeElement = f.below;
  f.enter(f.below);
  assert.equal(f.animations.length, 0);
  cleanup();

  const g = fixture();
  const dispose = installScrollReveal(g.root);
  g.enter(g.below);
  g.root.focus({target:g.below});
  assert.ok(g.animations[0].cancelled);
  dispose();
});

test('missing observer support needs no visibility classes or fallback timeout', () => {
  const f = fixture({supported:false});
  const cleanup = installScrollReveal(f.root);
  assert.equal(f.watched.length, 0);
  assert.equal(f.animations.length, 0);
  cleanup();
});
