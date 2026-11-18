// A COPY OF THE RUNTIME WITH SOME FILES REWRITTEN (kogaki#1855): a prompt file is read from beside the
// module that renders it, so a check that renders an earlier wording renders it from a copy of src/ and
// prompts/ carrying that wording. The packages, the Audiences and the Move library are linked, not copied.
import { cpSync, existsSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const roots = [];

// `files` maps a repo-relative path to the text it carries in the copy. Returns an importer over the copy.
export function treeWith(repo, files) {
  const root = mkdtempSync(join(tmpdir(), "tree-copy-"));
  roots.push(root);
  for (const d of ["src", "prompts"]) cpSync(join(repo, d), join(root, d), { recursive: true });
  for (const d of ["node_modules", "audiences", "moves"]) {
    if (existsSync(join(repo, d))) symlinkSync(join(repo, d), join(root, d));
  }
  for (const [path, text] of Object.entries(files)) writeFileSync(join(root, path), text);
  return (path) => import(pathToFileURL(join(root, path)).href);
}

export function removeTrees() {
  for (const r of roots.splice(0)) rmSync(r, { recursive: true, force: true });
}
