// The phone menu: the button toggles it, Escape or following a link in it closes
// it, and widening the window past the phone breakpoint closes it too.
const root = document.documentElement;
const menu = document.querySelector(".menu-btn");
const drawer = document.querySelector(".drawer");
// the open menu covers the page, so the page behind it leaves the Tab order
const behind = document.querySelectorAll("main, .site-foot");
const setMenu = (open) => {
  root.classList.toggle("menu-open", open);
  menu.setAttribute("aria-expanded", open);
  behind.forEach((el) => (el.inert = open));
};
menu.addEventListener("click", () => setMenu(!root.classList.contains("menu-open")));
// a section link keeps the page, so the menu would stay open over it
drawer.addEventListener("click", (e) => {
  if (e.target.closest("a")) setMenu(false);
});
// focus inside the menu would vanish with it, so it returns to the button
addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || !root.classList.contains("menu-open")) return;
  const inside = drawer.contains(document.activeElement);
  setMenu(false);
  if (inside) menu.focus();
});
// the skip link's target is inert while the menu covers it
document.querySelector(".skip").addEventListener("click", () => setMenu(false));
// widening hides the menu's own links and theme switch; focus on one moves to
// the header's theme switch or the page, rather than dropping to the body
matchMedia("(min-width: 761px)").addEventListener("change", (e) => {
  if (!e.matches) return;
  setMenu(false);
  const el = document.activeElement;
  if (!drawer.contains(el) || el.checkVisibility()) return;
  if (el.matches(".theme-btn")) document.querySelector(".site-head .theme-btn").focus();
  else document.getElementById("content").focus();
});
