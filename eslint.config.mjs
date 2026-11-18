// The JavaScript lint (kogaki#1747): ESLint's recommended set over src/ and
// checks/, run by checks/check-eslint.sh and .claude/hooks/lint-on-edit.py.
// A finding that predates it is a row in eslint-suppressions.json.
import js from "@eslint/js";
import importX from "eslint-plugin-import-x";
import globals from "globals";

export default [
  {
    files: ["src/**/*.mjs", "checks/**/*.mjs"],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    plugins: { "import-x": importX },
    rules: {
      ...js.configs.recommended.rules,
      "import-x/no-unresolved": "error",
      "import-x/no-duplicates": "error",
      "import-x/no-cycle": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector: "CallExpression[callee.name='renderPromptFile'] ObjectExpression Literal[value=/.{40,}/]",
          message: "a value handed to a prompt file comes from a record; a sentence belongs in a file under prompts/",
        },
        {
          selector: "CallExpression[callee.name='renderPromptFile'] ObjectExpression TemplateElement[value.raw=/.{40,}/]",
          message: "a value handed to a prompt file comes from a record; a sentence belongs in a file under prompts/",
        },
      ],
    },
  },
];
