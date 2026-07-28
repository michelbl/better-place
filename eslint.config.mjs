import js from "@eslint/js";
import globals from "globals";
import nodePlugin from "eslint-plugin-n";

export default [
  js.configs.recommended,
  nodePlugin.configs["flat/recommended"],
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "commonjs",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // App-local modules (e.g. ./config) are not published npm packages.
      "n/no-unpublished-require": "off",
      "n/no-unpublished-import": "off",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];
