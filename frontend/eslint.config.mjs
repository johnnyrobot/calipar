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
    // First-time linting (Next 16 removed `next lint`; this repo had no ESLint config)
    // surfaced ~115 pre-existing findings. The safe, compiler-checkable ones —
    // no-unused-vars and no-unescaped-entities — have been fixed and are now enforced
    // as errors (eslint-config-next defaults). The rules below remain warnings pending a
    // dedicated pass: `no-explicit-any` needs real type design, and the React Compiler
    // rules change hook/render behavior (the Compiler itself is not enabled — advisory).
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default eslintConfig;
