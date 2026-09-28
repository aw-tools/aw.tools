// The theme switch: each press steps system, light, dark. A light or dark
// choice is stored and set as data-theme on the root, which the inline script
// in the page head reapplies before first paint; system clears both.
const root = document.documentElement;
const order = ["system", "light", "dark"];
const names = { system: "◐ System", light: "☀ Light", dark: "☾ Dark" };
const buttons = document.querySelectorAll("[data-theme-btn]");
const current = () => root.dataset.theme || "system";
const paint = () =>
  buttons.forEach((b) => {
    b.textContent = names[current()];
    b.setAttribute("aria-label", `Theme: ${current()}. Change theme`);
  });
buttons.forEach((b) =>
  b.addEventListener("click", () => {
    const next = order[(order.indexOf(current()) + 1) % order.length];
    if (next === "system") delete root.dataset.theme;
    else root.dataset.theme = next;
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch (e) {}
    paint();
  })
);
paint();
