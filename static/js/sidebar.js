// The sidebar: fade the edge that has more behind it when the list overflows,
// and highlight the section of the current chapter that is in view.
const drawer = document.querySelector(".drawer");
const edges = () => {
  drawer.classList.toggle("more-above", drawer.scrollTop > 1);
  drawer.classList.toggle(
    "more-below",
    drawer.scrollTop + drawer.clientHeight < drawer.scrollHeight - 1,
  );
};
drawer.addEventListener("scroll", edges, { passive: true });
// also fires when the phone menu opens and the drawer first gets a size
new ResizeObserver(edges).observe(drawer);

const toc = document.querySelector("[data-toc]");
if (toc) {
  const links = [...toc.querySelectorAll('a[href^="#"]')];
  const byId = new Map(links.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
  const heads = [...document.querySelectorAll("main h2[id]")].filter((h) => byId.has(h.id));
  const mark = () => {
    let cur = heads[0];
    for (const h of heads) if (h.getBoundingClientRect().top < 120) cur = h;
    const on = cur && byId.get(cur.id);
    links.forEach((a) => a.classList.toggle("on", a === on));
  };
  addEventListener("scroll", mark, { passive: true });
  mark();
}
