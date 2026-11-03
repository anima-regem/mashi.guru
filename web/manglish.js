/* Mashi's original preview transducer (MIT). Swanalekha's MIT rule data is
 * supplied separately. No DOM adapter, dictionary, network or OS keyboard. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MashiManglish = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const owns = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const roman = c => !!c && /[A-Za-z@~_^#]/.test(c);
  const uri = /^(?:[A-Za-z][A-Za-z0-9+.-]*:\/\/|www\.|mailto:)[^\s`]+/i;
  const email = /^[A-Za-z0-9.!#$%&'*+\/=?^_{}|~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?=$|[\s),;!?])/;
  const drivePath = /^[A-Za-z]:[\\/][^\s`]+/;

  function createSession(rules) {
    if (!rules || typeof rules !== "object" || !owns(rules, "a")) throw new TypeError("Missing phonetic rules");
    const trie = Object.create(null);
    for (const [key, value] of Object.entries(rules)) {
      // Numeric suffixes encode the upstream Tab alternatives, not typed digits.
      if (/\d/.test(key) && !/^@\d$/.test(key)) continue;
      let node = trie;
      for (const character of key) node = node[character] ||= Object.create(null);
      node.value = value;
    }
    const cache = new Map();
    const history = new Map();
    let source = "", output = "", units = [], choices = [], convertedRuns = 0;

    function parseRun(run) {
      if (cache.has(run)) return cache.get(run);
      convertedRuns++;
      const result = [];
      for (let start = 0; start < run.length;) {
        let node = trie, match;
        for (let end = start; end < run.length && node[run[end]]; end++) {
          node = node[run[end]];
          if (owns(node, "value")) match = { start, end: end + 1, key: run.slice(start, end + 1), value: node.value };
        }
        if (!match) match = { start, end: start + 1, key: "", value: run[start] };
        const options = [match.value];
        if (match.key) for (let n = 2; n <= 9; n++) {
          const alternative = rules[match.key + n];
          if (alternative !== undefined && !options.includes(alternative)) options.push(alternative);
        }
        result.push({ ...match, options });
        start = match.end;
      }
      cache.set(run, result);
      if (cache.size > 256) cache.delete(cache.keys().next().value);
      return result;
    }

    function render() {
      let result = "";
      units = [];
      for (let at = 0; at < source.length;) {
        if (source[at] === "\\" && source[at + 1] === "`") { result += "`"; at += 2; continue; }
        if (source[at] === "`") {
          const close = source.indexOf("`", at + 1);
          result += source.slice(at + 1, close < 0 ? source.length : close);
          at = close < 0 ? source.length : close + 1;
          continue;
        }
        const rest = source.slice(at);
        const protectedText = rest.match(uri) || rest.match(email) || rest.match(drivePath);
        if (protectedText) { result += protectedText[0]; at += protectedText[0].length; continue; }
        if (!roman(source[at])) {
          const character = String.fromCodePoint(source.codePointAt(at));
          result += character; at += character.length; continue;
        }
        let end = at;
        while (end < source.length && (roman(source[end]) || (source[end - 1] === "@" && /[0-9]/.test(source[end])))) end++;
        // The upstream m+space rule finalizes anusvara; tabs/newlines stay literal.
        if (source[end] === " ") end++;
        for (const part of parseRun(source.slice(at, end))) {
          const unit = { ...part, start: at + part.start, end: at + part.end };
          const choice = choices.find(c => c.start === unit.start && c.end === unit.end && c.key === unit.key);
          const value = choice && unit.options.includes(choice.value) ? choice.value : unit.value;
          result += value;
          units.push({ ...unit, value });
        }
        at = end;
      }
      // Source Malayalam, joiners and emoji are intentionally never normalized.
      output = result;
      return output;
    }

    function remember() {
      history.set(source, choices.map(c => ({ ...c })));
      if (history.size > 64) history.delete(history.keys().next().value);
    }

    function update(next, inputType = "") {
      if (typeof next !== "string" || next.length > 65536) throw new RangeError("Preview text is too long");
      convertedRuns = 0;
      if (next !== source) {
        remember();
        if (/^history(?:Undo|Redo)$/.test(inputType) && history.has(next)) {
          choices = history.get(next).map(c => ({ ...c }));
        } else {
          let start = 0, oldEnd = source.length, newEnd = next.length;
          while (start < oldEnd && start < newEnd && source[start] === next[start]) start++;
          while (oldEnd > start && newEnd > start && source[oldEnd - 1] === next[newEnd - 1]) { oldEnd--; newEnd--; }
          const shift = newEnd - oldEnd;
          choices = choices.flatMap(c => c.end <= start ? [c] : c.start >= oldEnd ? [{ ...c, start: c.start + shift, end: c.end + shift }] : []);
        }
        source = next;
      }
      render();
      return { text: output, convertedRuns };
    }

    function alternativesAt(caret) {
      const unit = units.find(u => u.start < caret && caret <= u.end);
      return unit && unit.options.length > 1 ? { ...unit, options: [...unit.options] } : null;
    }

    function choose(unit, value) {
      const current = units.find(u => u.start === unit.start && u.end === unit.end && u.key === unit.key);
      if (!current || !current.options.includes(value)) return false;
      choices = choices.filter(c => !(c.start === current.start && c.end === current.end));
      choices.push({ start: current.start, end: current.end, key: current.key, value });
      render(); remember(); return true;
    }

    function reset() { source = output = ""; units = []; choices = []; history.clear(); cache.clear(); }
    return Object.freeze({ update, alternativesAt, choose, reset, value: () => output });
  }
  return Object.freeze({ createSession, version: "swanalekha-preview-1" });
});
