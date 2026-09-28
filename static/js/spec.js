// The spec page: switching revisions keeps the clause or section you are on,
// and a link to one this revision lacks says so instead of landing at the top.
document.querySelectorAll("[data-rev-link]").forEach((a) =>
  a.addEventListener("click", () => {
    if (location.hash) a.hash = location.hash;
  })
);

const want = decodeURIComponent(location.hash.slice(1));
if (want && !document.getElementById(want)) {
  const box = document.querySelector(".missing-clause");
  const kind = /^\d+(\.\d+)+$/.test(want) ? "Clause" : "Section";
  box.textContent = `${kind} ${want} does not exist in revision ${box.dataset.revision}.`;
  box.hidden = false;
}
