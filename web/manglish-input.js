/* Native-source-field adapter (MIT). Never assigns input.value, changes its
 * selection, intercepts keys, or reads clipboard data. Unicode is preview-only. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.MashiManglishInput = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function attach({ input, toggle, panel, alternativeRow, alternativeLabel, alternativeSelect, engine, rules, onChange, onError = () => {}, document: doc = input.ownerDocument }) {
    const session = engine.createSession(rules);
    const listeners = [];
    let composing = false, selectedUnit = null, stable = input.value;
    function listen(target, event, handler) {
      target.addEventListener(event, handler);
      listeners.push(() => target.removeEventListener(event, handler));
    }
    function alternatives() {
      selectedUnit = !composing && toggle.checked && input.selectionStart === input.selectionEnd ? session.alternativesAt(input.selectionStart) : null;
      alternativeRow.hidden = !selectedUnit;
      alternativeSelect.textContent = "";
      if (!selectedUnit) return;
      alternativeLabel.textContent = `Letter for “${selectedUnit.key.trim()}”`;
      for (const value of selectedUnit.options) {
        const option = doc.createElement("option");
        option.value = option.textContent = value;
        option.selected = value === selectedUnit.value;
        alternativeSelect.append(option);
      }
    }
    function update(event = {}) {
      panel.hidden = !toggle.checked;
      if (composing || event.isComposing || event.inputType === "insertCompositionText") return;
      try {
        stable = toggle.checked ? session.update(input.value, event.inputType).text : input.value;
        alternatives();
      } catch {
        // A failed converter must leave the native field and direct preview usable.
        stable = input.value;
        toggle.checked = false; toggle.disabled = true;
        panel.hidden = alternativeRow.hidden = true;
        selectedUnit = null; session.reset(); onError();
      }
      onChange();
    }
    listen(input, "compositionstart", () => { composing = true; alternativeRow.hidden = true; });
    listen(input, "compositionend", () => { composing = false; update(); });
    listen(input, "input", update);
    listen(toggle, "change", () => { update(); });
    for (const event of ["click", "keyup", "select"]) listen(input, event, alternatives);
    listen(doc, "selectionchange", () => { if (doc.activeElement === input) alternatives(); });
    listen(alternativeSelect, "change", () => {
      if (selectedUnit && session.choose(selectedUnit, alternativeSelect.value)) {
        stable = session.value(); onChange();
      }
    });
    toggle.disabled = false;
    panel.hidden = !toggle.checked;
    // Construction does not notify; callers can finish their own initialization.
    if (toggle.checked) stable = session.update(input.value).text;
    alternatives();
    return Object.freeze({
      value: () => stable,
      isComposing: () => composing,
      reset() { session.reset(); stable = input.value; update(); },
      destroy() { listeners.forEach(remove => remove()); session.reset(); stable = ""; selectedUnit = null; }
    });
  }
  return Object.freeze({ attach });
});
