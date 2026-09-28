// Site search over the guide and the current spec revision: Pagefind's JS API
// with our own markup, loaded on first use. While a query is typed the results
// take the place of whatever is marked data-when-searching="hide".
const form = document.querySelector(".search");
const input = form.querySelector("input");
const clear = form.querySelector(".search-clear");
const box = document.getElementById("search-results");
const status = box.querySelector(".search-status");
const list = box.querySelector("ol");
const hide = document.querySelectorAll('[data-when-searching="hide"]');
const drawer = input.closest(".drawer");

// the box starts hidden, so a page without this script shows no dead control
form.hidden = false;

// relative to this script, so the index is found under any base path
const index = new URL("../pagefind/pagefind.js", import.meta.url).href;
let pagefind;
// a failed load is forgotten, so the next keystroke tries again
const load = () =>
  (pagefind ??= import(index).then(async (pf) => {
    await pf.options({ excerptLength: 18 });
    pf.init();
    return pf;
  }).catch((e) => {
    pagefind = undefined;
    throw e;
  }));

const esc = (s) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// Pagefind cuts excerpts at a word count, often mid-sentence: start at the last
// sentence break before the first match, or mark the cut with "…"
const tidy = (html) => {
  let t = html.trim();
  const first = t.indexOf("<mark>");
  const before = first < 0 ? t : t.slice(0, first);
  let cut = -1;
  for (const m of before.matchAll(/[.!?:]\s+(?=\S)/g)) cut = m.index + m[0].length;
  if (cut > 0) t = t.slice(cut);
  else if (/^(<mark>)?[a-z]/.test(t)) t = "…" + t;
  if (!/[.!?:](<\/mark>)?$/.test(t)) t += "…";
  return t;
};

const hit = (url, title, text) =>
  `<a class="hit" href="${esc(url)}">${title}${text ? `<span class="hit-text">${tidy(text)}</span>` : ""}</a>`;

const render = (pages) =>
  pages.map((p) => {
    const subs = p.sub_results.filter((s) => s.url !== p.url).slice(0, 2);
    const src = p.meta.source ? `<span class="hit-src">${esc(p.meta.source)}</span>` : "";
    const title = `<span class="hit-title">${src}${esc(p.meta.title)}</span>`;
    const sections = subs.map((s) =>
      `<li>${hit(s.url, `<span class="hit-sub">${esc(s.title)}</span>`, s.excerpt)}</li>`
    );
    return `<li>${hit(p.url, title, subs.length ? "" : p.excerpt)}${
      subs.length ? `<ol>${sections.join("")}</ol>` : ""
    }</li>`;
  }).join("");

const show = (on) => {
  box.hidden = !on;
  clear.hidden = !on;
  hide.forEach((el) => (el.hidden = on));
  // the sidebar's edge fades follow its content, which just changed
  drawer?.dispatchEvent(new Event("scroll"));
};

// the query lasts the visit, so hopping between hits keeps the results;
// storage may be unavailable, and search then simply forgets
const KEY = "search-query";
const remember = (q) => {
  try {
    if (q) sessionStorage.setItem(KEY, q);
    else sessionStorage.removeItem(KEY);
  } catch (e) {}
};

let seq = 0;
const run = async () => {
  const q = input.value.trim();
  const mine = ++seq;
  remember(q);
  if (!q) {
    show(false);
    list.innerHTML = "";
    status.textContent = "";
    return;
  }
  show(true);
  let res, pages;
  try {
    const pf = await load();
    res = await pf.debouncedSearch(q, {}, 150);
    // a newer keystroke has taken over
    if (res === null || mine !== seq) return;
    pages = await Promise.all(res.results.slice(0, 8).map((r) => r.data()));
  } catch (e) {
    if (mine !== seq) return;
    list.innerHTML = "";
    status.textContent = "Search is unavailable here.";
    return;
  }
  if (mine !== seq) return;
  const n = res.results.length;
  status.textContent = n
    ? `${n} ${n === 1 ? "page matches" : "pages match"}`
    : `Nothing matches “${q}”.`;
  // a hit in focus is about to be replaced; focus moves to the first new hit,
  // or back to the box, rather than falling to the page
  const inResults = box.contains(document.activeElement);
  list.innerHTML = render(pages);
  if (inResults) (box.querySelector(".hit") ?? input).focus();
  drawer?.dispatchEvent(new Event("scroll"));
};

const reset = () => {
  input.value = "";
  run();
};

// an early start on first focus; a failure here shows once a query runs
input.addEventListener("focus", () => load().catch(() => {}), { once: true });
input.addEventListener("input", run);
try {
  input.value = sessionStorage.getItem(KEY) || "";
} catch (e) {}
if (input.value) run();

clear.addEventListener("click", () => {
  reset();
  input.focus();
});
input.addEventListener("keydown", (e) => {
  // a typed query clears before the phone menu's own Escape closes it
  if (e.key === "Escape" && input.value) {
    e.stopPropagation();
    reset();
  }
  // Enter steps into the results rather than opening the first one; an Enter
  // that confirms an input method's composition is left to it
  if ((e.key === "Enter" && !e.isComposing) || e.key === "ArrowDown") {
    e.preventDefault();
    box.querySelector(".hit")?.focus();
  }
});
box.addEventListener("keydown", (e) => {
  const hits = [...box.querySelectorAll(".hit")];
  const i = hits.indexOf(document.activeElement);
  if (i < 0) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    hits[i + 1]?.focus();
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    (hits[i - 1] ?? input).focus();
  }
});

// "/" focuses the box, unless the reader is already typing somewhere; on a
// phone, a box in the menu opens the menu first
addEventListener("keydown", (e) => {
  if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) return;
  e.preventDefault();
  const closed = !document.documentElement.classList.contains("menu-open");
  if (drawer && closed && matchMedia("(max-width: 760px)").matches) {
    document.querySelector(".menu-btn").click();
  }
  input.focus();
});
