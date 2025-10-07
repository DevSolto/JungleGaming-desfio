import { config } from "@repo/eslint-config/base";

export default [
  ...config,
  {
    rules: {
      "no-restricted-syntax": "off",
      "no-restricted-imports": "off",
    },
  },
];
