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
    // no-unused-vars, no-unescaped-entities, and no-explicit-any — are now fixed and
    // enforced as errors. The React Compiler / hooks rules below remain warnings pending
    // a dedicated pass: they change hook/render behaviour with no compiler safety net,
    // and most flag legitimate patterns (the React Compiler itself is not enabled).
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
];

export default eslintConfig;
