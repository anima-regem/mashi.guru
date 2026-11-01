/* Local-only progressive enhancement. Never inserts user text as HTML. */
"use strict";
(() => {
  const sample = "മഴ നനഞ്ഞ മണ്ണിന്റെ മണം.";
  const text = document.querySelector("#preview-text");
  const size = document.querySelector("#preview-size");
  const search = document.querySelector("#font-search");
  const cards = [...document.querySelectorAll("[data-font]")];
  const tabs = [...document.querySelectorAll("[data-filter]")];
  const status = document.querySelector("#results-status");
  let active = "all";

  function preview() {
    cards.forEach(card => { card.querySelector("[data-preview]").textContent = text.value.trim() || sample; });
  }
  function filter() {
    const query = search.value.trim().normalize("NFC").toLocaleLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const matches = (active === "all" || card.dataset.origin === active) && card.dataset.search.normalize("NFC").includes(query);
      card.hidden = !matches;
      visible += Number(matches);
    });
    document.querySelector("#font-count").textContent = String(visible);
    document.querySelector("#no-results").hidden = visible > 0;
    document.querySelector("#empty-title").textContent = "No fonts found.";
    document.querySelector("#empty-description").textContent = "Try another name, designer or category.";
    status.textContent = `${visible} font ${visible === 1 ? "family" : "families"} shown.`;
    tabs.forEach(tab => {
      const selected = tab.dataset.filter === active;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-pressed", String(selected));
    });
  }

  document.querySelector("#preview-tools").hidden = false;
  document.querySelector("#collection-filters").hidden = false;
  text.addEventListener("input", preview);
  search.addEventListener("input", filter);
  size.addEventListener("input", () => {
    document.documentElement.style.setProperty("--preview-size", `${size.value}px`);
    document.querySelector("#size-value").textContent = `${size.value} px`;
  });
  document.querySelector("#reset-preview").addEventListener("click", () => {
    text.value = "";
    size.value = "48";
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
    select.addEventListener("change", async () => {
      const file = select.value;
      if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}\.(ttf|otf)$/.test(file)) return;
      const family = `style-${card.dataset.font}-${select.selectedIndex}`;
      try {
        const face = new FontFace(family, `url("fonts/${card.dataset.font}/${file}")`);
        await face.load();
        document.fonts.add(face);
        card.querySelector("[data-preview]").style.fontFamily = `"${family}", sans-serif`;
      } catch { document.querySelector("#font-load-error").hidden = false; }
    });
  });
})();
