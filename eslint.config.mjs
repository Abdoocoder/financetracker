import nextPlugin from "@next/eslint-plugin-next";

const eslintConfig = [
  {
    ignores: [".next/**", "coverage/**", "mobile/**"],
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
