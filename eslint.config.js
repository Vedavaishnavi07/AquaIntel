import js from "@eslint/js";
import ts from "typescript-eslint";
export default ts.config(js.configs.recommended, ...ts.configs.recommended, {
  languageOptions: {
    globals: {
      self: "readonly",
      caches: "readonly",
      console: "readonly",
      process: "readonly",
      Buffer: "readonly",
      setTimeout: "readonly",
      URL: "readonly",
      fetch: "readonly",
      document: "readonly",
      window: "readonly",
      navigator: "readonly",
      FormData: "readonly",
      RequestInit: "readonly",
      HTMLFormElement: "readonly",
      File: "readonly",
      localStorage: "readonly",
    },
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
});
