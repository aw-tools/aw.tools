// The phone menu: the button toggles it, Escape or following a link in it closes
// it, and widening the window past the phone breakpoint closes it too.
const root = document.documentElement;
const menu = document.querySelector(".menu-btn");
const setMenu = (open) => {
  root.classList.toggle("menu-open", open);
  menu.setAttribute("aria-expanded", open);
};
menu.addEventListener("click", () => setMenu(!root.classList.contains("menu-open")));
// a section link keeps the page, so the menu would stay open over it
document.querySelector(".drawer").addEventListener("click", (e) => {
  if (e.target.closest("a")) setMenu(false);
});
addEventListener("keydown", (e) => {
  if (e.key === "Escape") setMenu(false);
});
matchMedia("(min-width: 761px)").addEventListener("change", (e) => {
  if (e.matches) setMenu(false);
});
