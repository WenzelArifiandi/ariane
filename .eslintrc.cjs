module.exports = {
  root: true,
  parserOptions: { ecmaVersion: "latest" },
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:astro/recommended", "prettier"],
  overrides: [{ files: ["*.astro"], parser: "astro-eslint-parser" }]
}