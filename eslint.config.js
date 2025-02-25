import jsPlugin from "@eslint/js"
import tsPlugin from "@typescript-eslint/eslint-plugin"
import tsParser from "@typescript-eslint/parser"
import globals from "globals"

export default [
  {
    files: ["**/*.{js,mjs,cjs,ts}"],

    languageOptions: {
      parser: tsParser,
      globals: globals.browser,
      sourceType: "module",
      ecmaVersion: "latest",
    },

    plugins: {
      "@typescript-eslint": tsPlugin,
    },

    rules: {
      ...jsPlugin.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": "error",
    },
  },
]
