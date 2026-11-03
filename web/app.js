/* Local-only progressive enhancement. Never inserts user text as HTML. */
"use strict";
(() => {
  const text = document.querySelector("#preview-text");
  const sample = text.placeholder;
  const size = document.querySelector("#preview-size");
  const search = document.querySelector("#font-search");
  const cards = [...document.querySelectorAll("[data-font]")];
  const tabs = [...document.querySelectorAll("[data-filter]")];
  const status = document.querySelector("#results-status");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const animations = new Map();
  let active = "all";
  let typing = null;

  function animate(element, frames, duration = 260) {
    animations.get(element)?.cancel();
    if (reducedMotion.matches || !element.animate) return;
    const animation = element.animate(frames, { duration, easing: "cubic-bezier(.2,.7,.2,1)" });
    animations.set(element, animation);
    animation.finished.then(() => {
      if (animations.get(element) === animation) animations.delete(element);
    }).catch(() => {});
  }
  function stopAnimations() {
    animations.forEach(animation => animation.cancel());
    animations.clear();
  }
  reducedMotion.addEventListener("change", stopAnimations);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopAnimations(); });

  function preview() {
    if (typing?.isComposing()) return;
    const value = typing ? typing.value() : text.value;
    cards.forEach(card => { card.querySelector("[data-preview]").textContent = value.trim() || sample; });
  }
  function filter() {
    // Capture only visible positions. No delay, stagger or entrance gate on results.
    const before = new Map(cards.filter(card => !card.hidden).map(card => [card, card.getBoundingClientRect()]));
    const query = search.value.trim().normalize("NFC").toLocaleLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const matches = (active === "all" || card.dataset.origin === active) && card.dataset.search.normalize("NFC").includes(query);
      card.hidden = !matches;
      visible += Number(matches);
    });
    document.querySelector("#font-count").textContent = String(visible);
    document.querySelector("#no-results").hidden = visible > 0;
    document.querySelector("#empty-title").textContent = query ? `No fonts match “${search.value.trim()}”.` : "No fonts found.";
    document.querySelector("#empty-description").textContent = "Try another name, designer or category.";
    status.textContent = `${visible} font ${visible === 1 ? "family" : "families"} shown.`;
    tabs.forEach(tab => {
      const selected = tab.dataset.filter === active;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-pressed", String(selected));
    });
    cards.filter(card => !card.hidden).forEach(card => {
      const previous = before.get(card);
      const next = card.getBoundingClientRect();
      if (!previous) {
        animate(card, [{ opacity: .65, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }]);
      } else if (Math.abs(previous.left - next.left) > 1 || Math.abs(previous.top - next.top) > 1) {
        animate(card, [{ transform: `translate(${previous.left - next.left}px, ${previous.top - next.top}px)` }, { transform: "none" }]);
      }
    });
  }

  document.querySelector("#preview-tools").hidden = false;
  document.querySelector("#collection-filters").hidden = false;
  const manglishControls = document.querySelector("#manglish-controls");
  if (manglishControls) {
    manglishControls.hidden = false;
    try {
      typing = globalThis.MashiManglishInput.attach({
        input: text,
        toggle: document.querySelector("#manglish-mode"),
        panel: document.querySelector("#manglish-panel"),
        alternativeRow: document.querySelector("#manglish-alternatives"),
        alternativeLabel: document.querySelector("#manglish-alternative-label"),
        alternativeSelect: document.querySelector("#manglish-alternative"),
        engine: globalThis.MashiManglish,
        rules: globalThis.MashiManglishRules,
        onChange: preview,
        onError: () => { document.querySelector("#manglish-error").hidden = false; }
      });
    } catch {
      document.querySelector("#manglish-mode").disabled = true;
      document.querySelector("#manglish-error").hidden = false;
    }
  }
  if (!typing) text.addEventListener("input", preview);
  text.addEventListener("focus", () => document.body.classList.add("is-previewing"));
  text.addEventListener("blur", () => document.body.classList.remove("is-previewing"));
  search.addEventListener("input", filter);
  size.addEventListener("input", () => {
    document.documentElement.style.setProperty("--preview-size", `${size.value}px`);
    document.querySelector("#size-value").textContent = `${size.value} px`;
  });
  document.querySelector("#reset-preview").addEventListener("click", () => {
    text.value = "";
    typing?.reset();
    size.value = size.defaultValue;
    size.dispatchEvent(new Event("input"));
    preview();
    text.focus();
  });
  tabs.forEach(tab => tab.addEventListener("click", () => { active = tab.dataset.filter; filter(); }));
  document.querySelector("#clear-filters").addEventListener("click", () => { active = "all"; search.value = ""; filter(); search.focus(); });

  // Native font loading stays entirely on this origin. A failed preview is visible to the visitor.
  if (document.fonts) {
    Promise.all(cards.map(card => document.fonts.load(`48px "font-${card.dataset.font}"`, sample)))
      .catch(() => { document.querySelector("#font-load-error").hidden = false; });
  }

  // Styles are taken only from validated filename options, not arbitrary URL input.
  cards.forEach(card => {
    const select = card.querySelector("[data-style]");
    if (select.options.length < 2) return;
    select.parentElement.hidden = false;
    let styleRequest = 0;
    select.addEventListener("change", async () => {
      const request = ++styleRequest;
      const file = select.value;
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}\.(ttf|otf)$/.test(file)) return;
      const family = `style-${card.dataset.font}-${select.selectedIndex}`;
      try {
        const face = new FontFace(family, `url("fonts/${card.dataset.font}/${file}")`);
        await face.load();
        if (request !== styleRequest) return;
        document.fonts.add(face);
        const specimen = card.querySelector("[data-preview]");
        specimen.style.fontFamily = `"${family}", sans-serif`;
        animate(specimen, [{ opacity: .6 }, { opacity: 1 }], 180);
      } catch { document.querySelector("#font-load-error").hidden = false; }
    });
  });
})();
