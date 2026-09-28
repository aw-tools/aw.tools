// Code blocks: a copy button on every block Zola highlighted. The script adds
// the buttons itself, so without it a block renders as it is, with no button
// that does nothing. One polite live region announces each copy; a button's
// own name never changes, so a screen reader never hears two announcements.
const blocks = document.querySelectorAll("pre.giallo");
if (blocks.length) {
  const status = document.createElement("span");
  status.className = "sr";
  status.setAttribute("aria-live", "polite");
  document.body.append(status);
  let quiet;
  const say = (text) => {
    clearTimeout(quiet);
    status.textContent = text;
    quiet = setTimeout(() => (status.textContent = ""), 2000);
  };

  blocks.forEach((pre) => {
    // the wrapper holds the button still while the block scrolls sideways
    const box = document.createElement("div");
    box.className = "code";
    pre.before(box);
    box.append(pre);
    // a block wider than its box scrolls, so it takes focus for the arrow keys
    // and a name to announce, as the landing page's terminal does
    if (pre.scrollWidth > pre.clientWidth) {
      pre.tabIndex = 0;
      pre.setAttribute("role", "region");
      pre.setAttribute("aria-label", "Code");
    }
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "code-copy";
    btn.setAttribute("aria-label", "Copy code");
    btn.innerHTML =
      '<svg class="i-copy" viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>'
      + '<svg class="i-done" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';
    box.append(btn);
    let tick;
    btn.addEventListener("click", async () => {
      clearTimeout(tick);
      try {
        await navigator.clipboard.writeText(pre.querySelector("code").textContent);
      } catch (e) {
        say("Couldn't copy the code.");
        return;
      }
      btn.classList.add("done");
      say("Copied");
      tick = setTimeout(() => btn.classList.remove("done"), 2000);
    });
  });
}
