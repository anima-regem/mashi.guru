import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const app = readFileSync(new URL('../web/app.js', import.meta.url), 'utf8');

// Small DOM fixture for preference changes and result continuity. The production
// script runs unchanged; there are no browser libraries or timed test sleeps.
function gallery(reduce = false) {
  const events = new Map();
  const calls = [];
  const preference = { matches: reduce, addEventListener(type, fn) { this.change = fn; } };
  function element(value = '') {
    const handlers = {};
    return {
      value, textContent: '', hidden: false, style: { setProperty() {} },
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener(type, fn) { handlers[type] = fn; },
      dispatchEvent(event) { handlers[event.type]?.(event); },
      emit(type) { handlers[type]?.(); }, focus() {},
      animate(frames, options) {
        const call = { frames, options, cancelled: false };
        calls.push(call);
        return { finished: new Promise(() => {}), cancel() { call.cancelled = true; } };
      }
    };
  }
  const text = element(); text.placeholder = 'മലയാളം';
  const size = element('64'); size.defaultValue = '64';
  const search = element();
  const entries = {};
  for (const id of ['preview-tools', 'collection-filters', 'font-count', 'no-results', 'empty-title', 'empty-description', 'results-status', 'size-value', 'reset-preview', 'clear-filters']) entries[`#${id}`] = element();
  Object.assign(entries, { '#preview-text': text, '#preview-size': size, '#font-search': search });
  const cards = ['chilanka', 'manjari'].map(name => {
    const card = element();
    card.dataset = { font: name, origin: 'reference', search: name };
    card.preview = element();
    card.querySelector = selector => selector === '[data-preview]' ? card.preview : { options: [1] };
    card.getBoundingClientRect = () => ({ left: cards.filter(c => !c.hidden).indexOf(card) * 500, top: 0 });
    return card;
  });
  const document = {
    querySelector: selector => entries[selector],
    querySelectorAll: selector => selector === '[data-font]' ? cards : [],
    documentElement: element(), body: element(),
    addEventListener(type, fn) { events.set(type, fn); }
  };
  runInNewContext(app, { document, window: { matchMedia: () => preference }, Event: class { constructor(type) { this.type = type; } } });
  return { cards, entries, text, size, search, calls, preference };
}

test('result motion follows a moved card, without delaying filtering', () => {
  const g = gallery();
  g.search.value = 'manjari'; g.search.emit('input');
  assert.equal(g.cards[0].hidden, true);
  assert.equal(g.cards[1].hidden, false);
  assert.equal(g.entries['#font-count'].textContent, '1');
  assert.equal(g.calls.length, 1);
  assert.match(g.calls[0].frames[0].transform, /500px/);
});

test('reduced motion keeps filtering and previews immediate without animations', () => {
  const g = gallery(true);
  g.search.value = 'manjari'; g.search.emit('input');
  g.text.value = 'കേരളം'; g.text.emit('input');
  assert.equal(g.cards[0].hidden, true);
  assert.equal(g.cards[1].preview.textContent, 'കേരളം');
  assert.equal(g.calls.length, 0);
});

test('changing the motion preference cancels an in-flight result transition', () => {
  const g = gallery();
  g.search.value = 'manjari'; g.search.emit('input');
  assert.equal(g.calls[0].cancelled, false);
  g.preference.matches = true; g.preference.change();
  assert.equal(g.calls[0].cancelled, true);
  g.search.value = ''; g.search.emit('input');
  assert.equal(g.calls.length, 1);
  assert.equal(g.cards[0].hidden, false);
});

test('preview input stays literal and reset restores the template default', () => {
  const g = gallery();
  const literal = '<img src=x onerror=alert(1)>';
  g.text.value = literal; g.text.emit('input');
  assert.equal(g.cards[0].preview.textContent, literal);
  g.size.value = '96'; g.entries['#reset-preview'].emit('click');
  assert.equal(g.size.value, '64');
  assert.equal(g.entries['#size-value'].textContent, '64 px');
  assert.equal(g.cards[0].preview.textContent, 'മലയാളം');
});
