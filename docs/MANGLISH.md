# Offline Manglish preview

Manglish is an optional input mode for the shared font specimen. It is off on every page load. The source field keeps exactly what the visitor types; the specimens show derived Malayalam. Disabling the checkbox immediately shows the original text again. Search, downloads and direct Malayalam typing are unchanged.

The conversion uses the [SMC Swanalekha phonetic rules](https://swanalekha.smc.org.in/guide/), pinned to revision `7463b55a0def8be146e58541840f1e9ad25b0b12`. Swanalekha is MIT licensed, by Santhosh Thottingal. We vendor its unmodified rule JSON and complete notices; we do **not** use its DOM adapter or install its old development dependencies. See [third-party notices](../THIRD_PARTY_NOTICES.md) for exact provenance.

## Typing

| Source | Specimen |
| --- | --- |
| `amma` | അമ്മ |
| `malayaaLaM` | മലയാളം |
| `pon~piili` | പൊൻപീലി |
| `dhwani` | ധ്വനി |
| `namaskaaram ` (with a final space) | നമസ്കാരം |

This is deterministic, case-sensitive phonetic conversion. It has no dictionary, prediction, word ranking or automatic spelling correction, and cannot promise the conventions of a commercial Manglish keyboard. A labelled native menu offers the rule's letter alternatives at the source caret. For example, `ka` offers ക, ഗ, ഖ, ഘ. Tab remains normal keyboard navigation. Common spellings such as `kha` also work directly.

While Manglish is on, ordinary Roman words are interpreted as phonetic input. Wrap English in backticks to keep it literal in the specimen; the delimiters are omitted from the rendered preview. URLs, email addresses and Windows drive paths are protected automatically. Malayalam, emoji, joiners, punctuation and ordinary digits pass through without Unicode normalization. Explicit `@1` digit rules remain available. Font shaping still depends on the selected font's glyphs and shaping tables.

## Editing and failure behavior

`web/manglish-input.js` observes native input and selection events. It never assigns the input value, moves the caret, intercepts keys, reads the clipboard or replaces existing event handlers. Source undo/redo, paste, selection and deletion therefore remain browser operations. Conversion waits until IME composition commits. Native Malayalam input can be used with either checkbox state.

The pure engine segments source into literal spans and phonetic runs, caches up to 256 runs, and converts only changed/uncached runs. Letter choices are tied to exact source ranges and invalidated when those ranges change. Up to 64 source-state snapshots retain preview choices for native history undo/redo. Choosing a preview alternative is separate preview state, like changing specimen size; it does not add an edit to the native text undo stack. Reset clears source and preview choices.

Missing initialization disables Manglish and keeps direct typing available. A runtime conversion failure also turns the mode off and shows a concise reload message. Text stays in memory only; it is not stored or sent anywhere.

## Offline and desktop reuse

The build embeds the rule table and our original engine/adapter into the same fingerprinted local `app.js`. There are no dynamic imports, package runtime dependencies, dictionaries, typing requests or remote API calls. Once the page assets are loaded, typing needs no network. A fresh uncached visit still needs the website; this change does not add a service worker or promise offline website installation. A desktop bundle can ship the same files as local assets.

The existing Mashi desktop app uses pywebview with Cocoa/WebKit and a local web UI. It can reuse this JS interface directly; a WASM wrapper would add another integration layer without making this small rule-based converter more offline. No OS keyboard/input-method registration is implemented, and the desktop repository is unchanged by this website patch.

Shared engine contract, usable from Node or a webview:

```js
// CommonJS: require('./manglish.js'); browser: globalThis.MashiManglish
const session = MashiManglish.createSession(MashiManglishRules);
session.update('amma');       // { text: 'അമ്മ', convertedRuns: 1 }
session.alternativesAt(4);   // optional { start, end, key, value, options }
session.value();             // 'അമ്മ'
session.reset();             // clear all source, cache and choices
```

`update(source, inputType)` accepts native `historyUndo` / `historyRedo` hints. Offsets use the source field's UTF-16 selection coordinates. `choose(unit, value)` only accepts an enumerated alternative for a current exact range. It returns a Boolean and changes derived output, never source. Each field needs its own session. The pure module has no DOM or network dependency and accepts at most 65,536 source code units; the gallery input remains limited to 200.

For a desktop proof field, attach the adapter to that field's existing native text control, feed `adapter.value()` into the specimen renderer, and use `adapter.isComposing()` to defer redraw. Supply the checkbox, help panel and labelled alternative select explicitly; destroy the adapter on unmount. Programmatic source updates must dispatch their normal input event or call `reset()` after assigning the new source. Do not attach conversion to filenames, search, metadata or download controls. This is a handoff contract; desktop integration and actual Cocoa/IME QA remain separate work.

## Verification scope

Run `node --test tests/*.test.*` and `python -m unittest discover -s tests -v`, then build. Tests cover documented phonetics, mixed Unicode, literal English/URLs, edits, alternatives, native-event composition boundaries, fallback, offline core execution, vendored integrity and notice retention. Composition tests are event simulations. Real-browser QA covers source undo/redo, paste, cursor edits, Tab navigation, mode switching, preview/search and responsive layout. Actual OS IME composition, mobile hardware keyboards and additional browser engines require manual follow-up; unit tests do not establish those behaviors.
