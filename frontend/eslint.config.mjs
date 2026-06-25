import next from "eslint-config-next";
import typescript from "eslint-config-next/typescript";

// eslint-config-next 16 ships native ESLint flat-config arrays. The default export
// (core-web-vitals) only registers the TS parser/plugin; the typescript-eslint
// recommended rules come from the separate `/typescript` preset, so spread both.
const eslintConfig = [
  ...next,
  ...typescript,
  {
    ignores: [".next/**", "node_modules/**", "e2e/**"],
  },
  {
    // This project had no ESLint config before Next 16 (the `next lint` command was
    // removed). Now that linting (core-web-vitals + typescript-eslint + the React
    // Compiler rules) runs for the first time, it surfaces ~115 pre-existing findings.
    // Ratchet approach: downgrade them to warnings so the framework upgrade isn't
    // blocked on unrelated cleanup — they stay visible and should be fixed in a
    // dedicated lint pass. (The React Compiler itself is not enabled; those are advisory.)
    rules: {
      "react/no-unescaped-entities": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default eslintConfig;
