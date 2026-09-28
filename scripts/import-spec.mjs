// Converts SPEC.md in agentic-workspace, and every text frozen at a spec-rN
// tag, into Zola pages under content/spec/. Nothing under content/spec/ is
// committed; the whole directory, including _index.md, is build output the
// importer recreates every run.
//
//   node scripts/import-spec.mjs <agentic-workspace checkout>
//
// The current revision comes from the working tree's SPEC.md, whose
// frontmatter is mandatory. A spec-rN tag supplies every superseded
// revision: its SPEC.md's frontmatter is optional, but when present must
// agree with its "Contract revision N" line, and either way the resulting
// revision must equal the tag's own N, be older than the current revision,
// and be the only tag claiming it. Every numbered section and clause gets a
// stable anchor id equal to its own number. SPEC-ERRATA.md holds the corrections
// to superseded revisions, one "## Revision N" section each, shown on that
// revision's page. A revision's opening paragraph is its description (see
// lede.mjs).

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { lede } from "./lede.mjs";

const [src] = process.argv.slice(2);
if (!src) {
  console.error("usage: import-spec.mjs <agentic-workspace checkout>");
  process.exit(2);
}

const root = join(import.meta.dirname, "..");
const out = join(root, "content", "spec");
const fail = (msg) => {
  console.error(`import-spec: ${msg}`);
  process.exit(1);
};

function parseFrontmatterRevision(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return null;
  const rm = m[1].match(/^revision:\s*([0-9]+)\s*$/m);
  return rm ? { revision: Number(rm[1]), bodyStart: m[0].length } : null;
}

// Only the text before the first "## " heading counts, and the line must
// carry both the revision and its published date.
const contractLine = /^\*\*Contract revision ([0-9]+)\.\*\* Published ([^\n]+)\.$/m;
function parseContractLine(text) {
  const preHeading = text.split(/^## /m)[0];
  const m = preHeading.match(contractLine);
  return m ? { revision: Number(m[1]), published: m[2] } : null;
}

// Anchors ids as their own number: a numbered section heading gets Zola's
// {#N} heading-id syntax, and a numbered clause becomes a self-link
// (<a class="clause" id="N" href="#N">N</a>). Skips fenced code blocks. Fails on a duplicate id.
function addAnchors(body, label) {
  const seen = new Set();
  const claim = (id) => {
    if (seen.has(id)) fail(`${label}: duplicate anchor id "${id}"`);
    seen.add(id);
  };

  const lines = body.split("\n");
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    let m = line.match(/^(#{2,6}) (\d+(?:\.\d+)*)\.\s+(.*)$/);
    if (m) {
      const [, hashes, num, rest] = m;
      claim(num);
      lines[i] = `${hashes} ${num}. ${rest} {#${num}}`;
      continue;
    }

    m = line.match(/^\*\*(\d+(?:\.\d+)+)\*\*/);
    if (m) {
      const num = m[1];
      claim(num);
      lines[i] = line.replace(/^\*\*(\d+(?:\.\d+)+)\*\*/, `<a class="clause" id="${num}" href="#${num}">${num}</a>`);
    }
  }
  return lines.join("\n");
}

function loadSpec(text, label, { requireFrontmatter = true, expectedRevision } = {}) {
  const fm = parseFrontmatterRevision(text);
  if (requireFrontmatter && !fm) fail(`${label}: no numeric 'revision' field in SPEC.md frontmatter`);
  const line = parseContractLine(text);
  if (!line) {
    fail(`${label}: no '**Contract revision N.** Published <date>.' line before the first '## ' heading`);
  }
  if (fm && fm.revision !== line.revision) {
    fail(`${label}: frontmatter revision ${fm.revision} disagrees with the text's ${line.revision}`);
  }
  const revision = fm ? fm.revision : line.revision;
  if (expectedRevision !== undefined && revision !== expectedRevision) {
    fail(`${label}: names revision ${expectedRevision} but its SPEC.md says ${revision}`);
  }

  let body = text.slice(fm ? fm.bodyStart : 0).replace(/^\n+/, "");
  const heading = body.match(/^# (.+)\n+/);
  if (!heading) fail(`${label}: does not start with a "# " heading`);
  const docTitle = heading[1].trim();
  // the page's own header states the revision and date, so the line leaves the body
  body = body.slice(heading[0].length).replace(contractLine, "").replace(/^\n+/, "");
  return { revision, published: line.published, docTitle, body: addAnchors(body, label) };
}

const currentText = readFileSync(join(src, "SPEC.md"), "utf8");
const current = loadSpec(currentText, "current SPEC.md");

const tags = execFileSync("git", ["-C", src, "tag", "--list", "spec-r*"], { encoding: "utf8" })
  .split("\n")
  .map((t) => t.trim())
  .filter(Boolean);

const claimedBy = new Map(); // revision -> tag name, for duplicate detection
const superseded = tags.map((tag) => {
  const m = tag.match(/^spec-r([0-9]+)$/);
  if (!m) fail(`tag ${tag} does not match spec-r<N>`);
  if (!/^[1-9][0-9]*$/.test(m[1])) fail(`tag ${tag}: revision must be a plain integer, no leading zero`);
  const tagRevision = Number(m[1]);

  let text;
  try {
    text = execFileSync("git", ["-C", src, "show", `${tag}:SPEC.md`], { encoding: "utf8" });
  } catch (e) {
    fail(`${tag} has no SPEC.md: ${e.message}`);
  }

  const spec = loadSpec(text, `${tag}:SPEC.md`, { requireFrontmatter: false, expectedRevision: tagRevision });

  if (spec.revision >= current.revision) {
    fail(
      `${tag} claims revision ${spec.revision}, which is not older than the current revision ${current.revision}`,
    );
  }
  if (claimedBy.has(spec.revision)) {
    fail(`${tag} and ${claimedBy.get(spec.revision)} both claim revision ${spec.revision}`);
  }
  claimedBy.set(spec.revision, tag);

  return spec;
});

const errata = new Map(); // revision -> its corrections, as markdown
const errataText = readFileSync(join(src, "SPEC-ERRATA.md"), "utf8");
for (const section of errataText.split(/^(?=## )/m).slice(1)) {
  const m = section.match(/^## Revision ([1-9][0-9]*)\n+([\s\S]*?)\s*$/);
  if (!m) fail(`SPEC-ERRATA.md: expected "## Revision N" and its corrections: ${section.split("\n")[0]}`);
  const revision = Number(m[1]);
  if (!claimedBy.has(revision)) fail(`SPEC-ERRATA.md: revision ${revision} is not a superseded revision`);
  if (errata.has(revision)) fail(`SPEC-ERRATA.md: revision ${revision} has more than one section`);
  if (!m[2]) fail(`SPEC-ERRATA.md: revision ${revision} has no corrections`);
  errata.set(revision, m[2]);
}

mkdirSync(out, { recursive: true });
for (const f of readdirSync(out)) rmSync(join(out, f), { recursive: true });

const revisions = [...superseded, current].sort((a, b) => a.revision - b.revision);
for (const rev of revisions) {
  const isCurrent = rev.revision === current.revision;
  const front = [
    `title = ${JSON.stringify(rev.docTitle)}`,
    `weight = ${rev.revision}`,
    "",
    "[extra]",
    `revision = ${rev.revision}`,
    `current = ${isCurrent}`,
    `published = ${JSON.stringify(rev.published)}`,
  ];
  const description = lede(rev.body);
  if (description) front.splice(2, 0, `description = ${JSON.stringify(description)}`);
  if (errata.has(rev.revision)) front.push(`errata = ${JSON.stringify(errata.get(rev.revision))}`);
  writeFileSync(join(out, `r${rev.revision}.md`), `+++\n${front.join("\n")}\n+++\n\n${rev.body}`);
}

writeFileSync(
  join(out, "_index.md"),
  [
    "+++",
    `title = "Spec"`,
    `sort_by = "weight"`,
    `page_template = "spec-page.html"`,
    `insert_anchor_links = "right"`,
    `redirect_to = "spec/r${current.revision}"`,
    "+++",
    "",
  ].join("\n"),
);

console.error(
  `import-spec: revision ${current.revision} current, ${superseded.length} superseded revision(s) from ${src}`,
);
