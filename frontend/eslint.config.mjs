import next from "eslint-config-next";

// eslint-config-next 16 ships a native ESLint flat-config array
// (core-web-vitals + typescript). Spread it directly — no FlatCompat needed.
const eslintConfig = [
  ...next,
  {
    ignores: [".next/**", "node_modules/**", "e2e/**"],
  },
  {
    // This project had no ESLint config before Next 16 (the `next lint` command was
    // removed), and eslint-config-next 16 newly enables the strict React Compiler
    // rules. The following pre-existing findings are downgraded to warnings so the
    // framework upgrade isn't blocked on unrelated cleanup — they remain visible and
    // should be addressed in a dedicated lint pass. (The React Compiler itself is not
    // enabled; these are advisory.)
    rules: {
      "react/no-unescaped-entities": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
];

export default eslintConfig;
