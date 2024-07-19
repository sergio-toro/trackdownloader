module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:prettier/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    tsconfigRootDir: __dirname,
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2018,
    sourceType: "module",
  },
  settings: {
    "import/resolver": {
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
      alias: {
        map: [
          ["@renderer", "./src/renderer"],
          ["@components", "./src/renderer/components"],
          ["@common", "./src/common"],
          ["@main", "./src/main"],
          ["@src", "./src"],
          ["@styles", "./src/renderer/styles"],
          ["@assets", "./assets"],
        ],
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
    },
    react: {
      version: "detect",
    },
  },
  rules: {
    "prettier/prettier": ["error", { singleQuote: false, endOfLine: "lf" }],
    quotes: ["error", "double", { avoidEscape: true }],
    //    "react/prop-types": "error",
    //    "@typescript-eslint/no-var-requires": "off"
  },
};
