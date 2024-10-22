import globals from "globals";
import jsPlugin from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

export default [
  {
    // Apply this configuration to JavaScript and TypeScript files
    files: ["**/*.{js,mjs,cjs,ts}"],

    // Specify the JavaScript and TypeScript language options
    languageOptions: {
      parser: tsParser, // Set the parser for TypeScript
      globals: globals.browser, // Use browser globals (e.g., window, document)
      sourceType: "module", // Set ES module type for JavaScript
      ecmaVersion: "latest", // Use the latest ECMAScript version
    },

    // Use JavaScript and TypeScript ESLint rules
    plugins: {
      "@typescript-eslint": tsPlugin, // Register the TypeScript plugin
    },

    // Apply recommended rules for both JS and TS
    rules: {
      ...jsPlugin.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules, // Access rules properly
      // Disable no-explicit-any rule
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
];
