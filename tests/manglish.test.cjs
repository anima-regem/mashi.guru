const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const rules = require('../vendor/swanalekha/rules.json');
const { createSession } = require('../web/manglish.js');
const { attach } = require('../web/manglish-input.js');

for (const [roman, malayalam] of [
  ['amma', 'അമ്മ'], ['malayaaLaM ente maathRbhaasha', 'മലയാളം എന്റെ മാതൃഭാഷ'],
  ['sarigamapadhani', 'സരിഗമപധനി'], ['pon~piili', 'പൊൻപീലി'],
  ['dhvani', 'ധ്വനി'], ['dhwani', 'ധ്വനി'], ['namaskaaram ', 'നമസ്കാരം '],
  ['axaraM', 'അക്ഷരം'], ['sampradaayam~', 'സമ്പ്രദായം'], ['jnjaanappaana', 'ജ്ഞാനപ്പാന']
]) test(`official phonetic convention: ${roman}`, () => {
  assert.equal(createSession(rules).update(roman).text, malayalam);
});

test('mixed Malayalam, joiners, emoji, punctuation and literal digits remain intact', () => {
  const direct = 'മലയാളം ൻ ന\u0d4d\u200d ന\u0d4d\u200c 👩‍💻 2026!';
  assert.equal(createSession(rules).update(direct).text, direct);
  assert.equal(createSession(rules).update(`amma ${direct}`).text, `അമ്മ ${direct}`);
});

test('URLs, email, Windows paths and explicitly quoted English are never transliterated', () => {
  const text = 'amma https://mashi.guru/ka?q=amma www.example.com ka@example.org mailto:ka@example.org C:\\Fonts\\Mashi `Mashi UI`';
  assert.equal(createSession(rules).update(text).text, text.replace('amma ', 'അമ്മ ').replace('`Mashi UI`', 'Mashi UI'));
  assert.equal(createSession(rules).update('amma `English pending').text, 'അമ്മ English pending');
  assert.equal(createSession(rules).update('\\`').text, '`');
});

test('literal numbers are not the upstream Tab selector; explicit Malayalam digits work', () => {
  assert.equal(createSession(rules).update('ka2 @1@2@3').text, 'ക2 ൧൨൩');
});

test('alternatives are scoped to exact source letters and edits invalidate only affected choices', () => {
  const s = createSession(rules);
  s.update('amma ka');
  const choice = s.alternativesAt(7);
  assert.deepEqual(choice.options, ['ക', 'ഗ', 'ഖ', 'ഘ']);
  assert.equal(s.choose(choice, 'ഗ'), true);
  assert.equal(s.value(), 'അമ്മ ഗ');
  assert.equal(s.choose(choice, '<script>'), false);
  assert.equal(s.update('amma! ka').text, 'അമ്മ! ഗ');
  assert.equal(s.update('amma! kha').text, 'അമ്മ! ഖ');
});

test('native history input restores the associated preview choice without rewriting source', () => {
  const s = createSession(rules);
  s.update('ka'); s.choose(s.alternativesAt(2), 'ഗ');
  s.update('kha');
  assert.equal(s.update('ka', 'historyUndo').text, 'ഗ');
  assert.equal(s.update('kha', 'historyRedo').text, 'ഖ');
});

test('unchanged runs are cached; an edit does not retransliterate the document', () => {
  const s = createSession(rules);
  assert.equal(s.update('amma ka').convertedRuns, 2);
  assert.equal(s.update('amma kha').convertedRuns, 1);
  assert.equal(s.update('amma kha').convertedRuns, 0);
  s.reset();
  assert.equal(s.update('amma kha').convertedRuns, 2);
});

test('the standalone core works with all network primitives unavailable', () => {
  const context = { module: { exports: {} }, fetch() { throw Error('network forbidden'); }, XMLHttpRequest() { throw Error('network forbidden'); }, WebSocket() { throw Error('network forbidden'); } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../web/manglish.js'), 'utf8'), context);
  assert.equal(context.module.exports.createSession(rules).update('amma').text, 'അമ്മ');
  assert.throws(() => createSession(null), /Missing/);
  assert.throws(() => createSession(rules).update('a'.repeat(65537)), /too long/);
});

class Target {
  constructor() { this.listeners = new Map(); this.hidden = true; this.checked = false; this.disabled = true; this.options = []; }
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn); }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn); }
  emit(name, event = {}) { for (const fn of this.listeners.get(name) || []) fn(event); }
  append(option) { this.options.push(option); }
  set textContent(value) { this._text = value; this.options = []; }
  get textContent() { return this._text; }
}
function inputFixture() {
  const input = new Target(), toggle = new Target(), panel = new Target(), row = new Target(), label = new Target(), select = new Target(), doc = new Target();
  let raw = '', start = 0, end = 0, notifications = 0;
  const existingKeydown = () => {}, existingKeypress = () => {};
  input.onkeydown = existingKeydown; input.onkeypress = existingKeypress;
  Object.defineProperties(input, {
    value: { get: () => raw, set() { throw Error('adapter must not write native text'); } },
    selectionStart: { get: () => start, set() { throw Error('adapter must not move selection'); } },
    selectionEnd: { get: () => end, set() { throw Error('adapter must not move selection'); } }
  });
  doc.createElement = () => ({}); doc.activeElement = input; input.ownerDocument = doc;
  const adapter = attach({ input, toggle, panel, alternativeRow: row, alternativeLabel: label, alternativeSelect: select, engine: { createSession }, rules, onChange() { notifications++; } });
  function enter(value, event = {}, selection = [value.length, value.length]) { raw = value; [start, end] = selection; input.emit('input', event); }
  return { input, toggle, panel, row, label, select, doc, adapter, enter, notifications: () => notifications, existingKeydown, existingKeypress };
}

test('mode is opt-in and disabling it restores direct source without modifying selection or handlers', () => {
  const f = inputFixture();
  f.enter('amma', {}, [1, 3]);
  assert.equal(f.adapter.value(), 'amma');
  f.toggle.checked = true; f.toggle.emit('change');
  assert.equal(f.adapter.value(), 'അമ്മ');
  assert.equal(f.input.value, 'amma');
  assert.deepEqual([f.input.selectionStart, f.input.selectionEnd], [1, 3]);
  assert.equal(f.input.onkeydown, f.existingKeydown);
  assert.equal(f.input.onkeypress, f.existingKeypress);
  f.toggle.checked = false; f.toggle.emit('change');
  assert.equal(f.adapter.value(), 'amma');
  assert.equal(f.panel.hidden, true);
});

test('IME composition stays untouched and does not publish intermediate previews', () => {
  const f = inputFixture(); f.toggle.checked = true; f.toggle.emit('change'); f.enter('amma');
  const count = f.notifications();
  f.input.emit('compositionstart');
  f.enter('ammak', { isComposing: true, inputType: 'insertCompositionText' });
  assert.equal(f.adapter.value(), 'അമ്മ');
  assert.equal(f.notifications(), count);
  f.enter('അമ്മ ക്', { isComposing: true });
  f.input.emit('compositionend');
  assert.equal(f.adapter.value(), 'അമ്മ ക്');
  assert.equal(f.input.value, 'അമ്മ ക്');
});

test('mobile composition input without a start event is deferred until committed input', () => {
  const f = inputFixture(); f.toggle.checked = true; f.toggle.emit('change'); f.enter('amma');
  f.enter('ammak', { isComposing: true });
  assert.equal(f.adapter.value(), 'അമ്മ');
  f.enter('amma ka', { inputType: 'insertText' });
  assert.equal(f.adapter.value(), 'അമ്മ ക');
});

test('paste, undo, redo and deletion use the native input state rather than intercepted keys', () => {
  const f = inputFixture(); f.toggle.checked = true; f.toggle.emit('change');
  f.enter('amma മലയാളം', { inputType: 'insertFromPaste' });
  assert.equal(f.adapter.value(), 'അമ്മ മലയാളം');
  f.enter('amma', { inputType: 'historyUndo' });
  assert.equal(f.adapter.value(), 'അമ്മ');
  f.enter('amma മലയാളം', { inputType: 'historyRedo' });
  assert.equal(f.adapter.value(), 'അമ്മ മലയാളം');
  f.enter('amma മലയാള', { inputType: 'deleteContentBackward' });
  assert.equal(f.adapter.value(), 'അമ്മ മലയാള');
  for (const name of ['keydown', 'keypress', 'beforeinput', 'paste']) assert.equal(f.input.listeners.has(name), false);
});

test('letter choices are available through a labelled native menu and Tab is not captured', () => {
  const f = inputFixture(); f.toggle.checked = true; f.toggle.emit('change'); f.enter('ka');
  assert.equal(f.row.hidden, false);
  assert.equal(f.label.textContent, 'Letter for “ka”');
  assert.deepEqual(f.select.options.map(x => x.value), ['ക', 'ഗ', 'ഖ', 'ഘ']);
  f.select.value = 'ഘ'; f.select.emit('change');
  assert.equal(f.adapter.value(), 'ഘ');
  assert.equal(f.input.value, 'ka');
  let trapped = false; f.input.emit('keydown', { key: 'Tab', preventDefault() { trapped = true; } });
  assert.equal(trapped, false);
});

test('reset clears preview choices and destroy removes all adapter listeners', () => {
  const f = inputFixture(); f.toggle.checked = true; f.toggle.emit('change'); f.enter('ka');
  f.select.value = 'ഗ'; f.select.emit('change');
  f.adapter.reset(); assert.equal(f.adapter.value(), 'ക');
  const count = f.notifications(); f.adapter.destroy(); f.enter('amma');
  assert.equal(f.notifications(), count);
  assert.equal(f.input.value, 'amma');
});

test('a converter failure disables only Manglish and keeps direct typing working', () => {
  const f = inputFixture(); f.toggle.checked = true; f.toggle.emit('change');
  f.enter('a'.repeat(65537));
  assert.equal(f.toggle.checked, false);
  assert.equal(f.toggle.disabled, true);
  assert.equal(f.panel.hidden, true);
  assert.equal(f.adapter.value(), f.input.value);
  f.enter('Direct മലയാളം');
  assert.equal(f.adapter.value(), 'Direct മലയാളം');
});
