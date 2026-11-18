// The renderer of a file under prompts/ for a program written in another language (kogaki#1863): the prompt's name is
// the argument, its values one JSON record on standard input, and what renderPromptFile returns goes to standard output.
import { readFileSync } from "node:fs";
import { renderPromptFile } from "./prompt-file.mjs";

const [name] = process.argv.slice(2);
if (!name) {
  process.stderr.write("usage: node src/prompt-file-cli.mjs <prompt name> < values.json\n");
  process.exit(2);
}
try {
  process.stdout.write(renderPromptFile(name, JSON.parse(readFileSync(0, "utf8"))));
} catch (e) {
  process.stderr.write(`prompt-file-cli: ${e.message}\n`);
  process.exit(1);
}
