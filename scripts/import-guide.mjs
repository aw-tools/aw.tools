// Converts the guide in agentic-workspace into Zola pages under content/guide/.
// The converted files are build output and never committed.
//
//   node scripts/import-guide.mjs <guide dir> <sitemap url>
//
// Chapters take their order from the file number and their URL from the rest
// of the filename; the glossary comes last. The first heading becomes the page
// title, its opening paragraph the description (see lede.mjs), and a link to
// another chapter becomes Zola's `@/` form, so a broken one fails the Zola
// build. Every old slug in guide-renames.txt becomes an alias
// of its new page. The build fails when the live sitemap cannot be fetched, or
// lists a guide page that is now neither a page nor an alias.

import { readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { lede } from "./lede.mjs";

const [src, sitemapUrl] = process.argv.slice(2);
if (!src || !sitemapUrl) {
  console.error("usage: import-guide.mjs <guide dir> <sitemap url>");
  process.exit(2);
}

const root = join(import.meta.dirname, "..");
const out = join(root, "content", "guide");
const fail = (msg) => {
  console.error(`import-guide: ${msg}`);
  process.exit(1);
};

const files = readdirSync(src).filter((f) => f.endsWith(".md")).sort();
const chapters = files.filter((f) => /^\d+-.+\.md$/.test(f));
if (!files.includes("glossary.md")) fail(`no glossary.md in ${src}`);
const order = [...chapters, "glossary.md"];
const extra = files.filter((f) => !order.includes(f));
if (extra.length) fail(`not a chapter or the glossary: ${extra.join(", ")}`);
const slugOf = (f) => basename(f, ".md").replace(/^\d+-/, "");

// old slug -> new slug, one pair per line; # starts a comment
const renames = new Map();
for (const line of readFileSync(join(root, "guide-renames.txt"), "utf8").split("\n")) {
  const text = line.replace(/#.*/, "").trim();
  if (!text) continue;
  const [from, to, rest] = text.split(/\s+/);
  if (!to || rest) fail(`guide-renames.txt: expected "<old> <new>": ${line}`);
  renames.set(from, to);
}
const slugs = new Set(order.map(slugOf));
for (const [from, to] of renames) {
  if (!slugs.has(to)) fail(`guide-renames.txt: ${from} renames to ${to}, which is not a chapter`);
  if (slugs.has(from)) fail(`guide-renames.txt: ${from} is still a chapter`);
}

let res;
try {
  res = await fetch(sitemapUrl);
} catch (e) {
  fail(`cannot fetch ${sitemapUrl}: ${e.cause?.message ?? e.message}`);
}
if (!res.ok) fail(`cannot fetch ${sitemapUrl}: HTTP ${res.status}`);
const live = [...(await res.text()).matchAll(/<loc>[^<]*\/guide\/([^/<]+)\/<\/loc>/g)].map((m) => m[1]);
const lost = live.filter((s) => !slugs.has(s) && !renames.has(s));
if (lost.length) {
  fail(`live guide pages with no page and no entry in guide-renames.txt: ${lost.join(", ")}`);
}

for (const f of readdirSync(out)) if (f !== "_index.md") rmSync(join(out, f));

const quote = (s) => JSON.stringify(s);
order.forEach((f, i) => {
  const text = readFileSync(join(src, f), "utf8");
  const heading = text.match(/^# (.+)\n+/);
  if (!heading) fail(`${f} does not start with a "# " heading`);
  const body = text.slice(heading[0].length).replace(/\]\(([^)\s]+\.md)(#[^)\s]*)?\)/g, (link, target, anchor = "") => {
    if (/^[a-z]+:/.test(target)) return link;
    if (!order.includes(target)) fail(`${f} links to ${target}, which is not a chapter`);
    return `](@/guide/${slugOf(target)}.md${anchor})`;
  });
  const aliases = [...renames].filter(([, to]) => to === slugOf(f)).map(([from]) => `/guide/${from}/`);
  const front = [`title = ${quote(heading[1].trim())}`, `weight = ${i + 1}`];
  const description = lede(body);
  if (description) front.push(`description = ${quote(description)}`);
  if (aliases.length) front.push(`aliases = [${aliases.map(quote).join(", ")}]`);
  writeFileSync(join(out, `${slugOf(f)}.md`), `+++\n${front.join("\n")}\n+++\n\n${body}`);
});
console.error(`import-guide: ${order.length} pages from ${src}, ${live.length} live guide URLs checked`);
