// A page's description, taken from the paragraph that opens its body: its
// whole sentences up to 160 characters, the length search results show, and at
// least the first. A body that opens with a heading, a list or anything else but
// a paragraph gets none, and the page falls back to the site's description.

const LIMIT = 160;

export const lede = (body) => {
  const para = body.trimStart().split(/\n\s*\n/)[0];
  if (!para || !/^[\p{L}`*_[]/u.test(para)) return undefined;
  const plain = para
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = plain.split(/(?<=[.!?])\s+/);
  let text = sentences[0];
  for (const s of sentences.slice(1)) {
    if (text.length + 1 + s.length > LIMIT) break;
    text += ` ${s}`;
  }
  return text;
};
