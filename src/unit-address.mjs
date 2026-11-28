// unit-address — the Kinds of a served Unit's address that `node src/rs.mjs`, `node src/satellite.mjs` and an RS
// file read (kogaki#1989), and the headline read from a Unit's text. A further Kind is one edit here.

// The Kinds whose text is read.
export const READ_KINDS = Object.freeze(["lesson", "decision", "statute"]);
// The Kinds a written statement rests on and an RS file cites: those read, and a Journey.
export const CITED_KINDS = Object.freeze([...READ_KINDS, "journey"]);
// The Kinds whose text may open with a headline between `**` marks.
const HEADLINED = new Set(["decision", "statute"]);

const pattern = (kinds) => new RegExp(`^([^\\s:/@]+)::(${kinds.join("|")})\\/([^\\s/@]+)$`);
// `<package>::<kind>/<local-name>`, capturing the three.
export const READ_ADDRESS = pattern(READ_KINDS);
export const CITED_ADDRESS = pattern(CITED_KINDS);
// `<package>::<kind>/<local-name>@<hash>`.
export const CITE = new RegExp(`^[^\\s:/@]+::(?:${CITED_KINDS.join("|")})\\/[^\\s/@]+@[0-9a-f]+$`);

// The accepted forms as a refusal names them: `<package>::lesson/<local-name>, … or <package>::statute/<local-name>`.
export function formsOf(kinds) {
  const forms = kinds.map((k) => `<package>::${k}/<local-name>`);
  return `${forms.slice(0, -1).join(", ")} or ${forms.at(-1)}`;
}

// A Decision's or a Statute's text that opens with `**`: the words up to the next `**`; otherwise null.
export function headlineOf(kind, text) {
  const t = String(text ?? "");
  if (!HEADLINED.has(kind) || !t.startsWith("**")) return null;
  const end = t.indexOf("**", 2);
  return end > 2 ? t.slice(2, end).trim() : null;
}
