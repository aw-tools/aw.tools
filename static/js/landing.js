// The landing page: the hero's install command copies to the clipboard, the
// hero terminal plays one session once it scrolls into view, the sticky
// header's brand fades in once the hero's own lockup has scrolled past it,
// and the "how it works" diagram advances through its five steps on its own.
// Every element here only exists on the landing page, so each piece guards
// itself and does nothing on any other page.
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// the hero's install command: copy, then a tick for two seconds. The aria-live
// region beside the button is the one announcement channel: the button's own
// aria-label never changes, so a screen reader never hears two announcements
document.querySelectorAll(".install-copy").forEach((btn) => {
  const status = btn.closest(".install").querySelector("[data-install-status]");
  btn.addEventListener("click", async () => {
    const text = btn.parentElement.querySelector("code").textContent;
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      if (status) status.textContent = "Couldn't copy the install command.";
      return;
    }
    btn.classList.add("done");
    if (status) status.textContent = "Copied the install command to the clipboard.";
    setTimeout(() => {
      btn.classList.remove("done");
      if (status) status.textContent = "";
    }, 2000);
  });
});

// the terminal: the session is in the markup, so it reads without script and
// under reduced motion; with script and motion allowed, it types once when it
// scrolls into view, then offers a replay
const term = document.querySelector("[data-term]");
if (term && !reduced) {
  const parts = [...term.children].map((el) => ({ cls: el.className, html: el.innerHTML, text: el.textContent }));
  const replay = term.closest(".term").querySelector(".term-replay");
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let run = 0;
  const play = async () => {
    const mine = ++run;
    replay.hidden = true;
    // hold the finished session's height, so the box never grows while it types
    term.style.height = "";
    term.style.height = term.offsetHeight + "px";
    term.textContent = "";
    term.classList.add("playing");
    term.setAttribute("aria-busy", "true");
    for (const p of parts) {
      const el = document.createElement("span");
      el.className = p.cls;
      if (term.childNodes.length) term.append("\n");
      term.append(el);
      if (p.cls === "o") {
        const lines = p.html.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (mine !== run) return;
          el.innerHTML = lines.slice(0, i + 1).join("\n");
          await wait(45);
        }
        await wait(500);
      } else {
        el.classList.add("typing");
        for (let i = 1; i <= p.text.length; i++) {
          if (mine !== run) return;
          el.textContent = p.text.slice(0, i);
          await wait(p.cls === "n" ? 18 : 42);
        }
        el.classList.remove("typing");
        await wait(p.cls === "n" ? 900 : 350);
      }
    }
    term.classList.remove("playing");
    term.removeAttribute("aria-busy");
    replay.hidden = false;
  };
  replay.addEventListener("click", play);
  const seen = new IntersectionObserver((es) => {
    if (es.some((e) => e.isIntersecting)) {
      seen.disconnect();
      play();
    }
  }, { threshold: .4 });
  seen.observe(term);
}

// the header's brand appears once the hero's own lockup has scrolled under it
const brand = document.querySelector(".site-head .brand.away");
const lockup = document.querySelector(".lp-lockup-link");
if (brand && lockup) {
  const head = document.querySelector(".site-head").offsetHeight;
  new IntersectionObserver(([e]) => brand.classList.toggle("away", e.isIntersecting), {
    rootMargin: `-${head}px 0px 0px 0px`,
  }).observe(lockup);
}

// the diagram: five steps; advances on its own until someone picks a step.
// While it plays, the current step's bar fills in CSS, and the bar's
// animationend moves to the next step, so the two cannot drift apart
const flow = document.querySelector("[data-flow]");
if (flow) {
  const buttons = [...flow.querySelectorAll("[data-go]")];
  const pause = flow.querySelector("[data-flow-pause]");
  let step = 0;
  const show = (n) => {
    step = n;
    flow.dataset.step = n;
    buttons.forEach((b) => {
      b.setAttribute("aria-current", b.dataset.go == n ? "step" : "false");
      b.classList.toggle("done", +b.dataset.go < n);
    });
  };
  // the pause button's accessible name is its own text, so it always says
  // what pressing it will do next
  const syncPause = () => {
    pause.textContent = flow.classList.contains("playing") ? "Pause" : "Play";
  };
  buttons.forEach((b) =>
    b.addEventListener("click", () => {
      flow.classList.remove("playing");
      syncPause();
      show(+b.dataset.go);
    })
  );
  pause.addEventListener("click", () => {
    const playing = flow.classList.toggle("playing");
    syncPause();
    // pressing play before the diagram has ever run (reduced motion skips
    // the autoplay that would otherwise have called this) starts it at 1
    if (playing && step === 0) show(1);
  });
  flow.addEventListener("animationend", (e) => {
    if (e.pseudoElement === "::before" && flow.classList.contains("playing") && e.target.getAttribute("aria-current") === "step") {
      show(step % 5 + 1);
    }
  });
  // under reduced motion the diagram stays in its undimmed, unstepped state
  // until someone presses play or picks a step themselves
  if (!reduced) {
    show(1);
    const start = () => {
      flow.classList.add("playing");
      syncPause();
    };
    const seen = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        seen.disconnect();
        start();
      }
    }, { threshold: .3 });
    seen.observe(flow);
  } else {
    syncPause();
  }
}
