import nextPlugin from "@next/eslint-plugin-next";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "coverage/**",
      "mobile/**",
      // AI agent tooling directories (not application code)
      ".claude/**",
      ".agents/**",
      ".continue/**",
      ".cursor/**",
      ".gemini/**",
      ".kilo/**",
      ".opencode/**",
      // Generated / output directories
      "brag-output*/**",
      "docs/**",
      "observability/**",
      "scripts/**",
      "templates/**",
      "secure_configs/**",
      "public/**",
    ],
  },
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },
];

export default eslintConfig;
