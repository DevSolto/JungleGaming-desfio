import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import turboPlugin from "eslint-plugin-turbo";
import tseslint from "typescript-eslint";
import onlyWarn from "eslint-plugin-only-warn";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["packages/types/**/*"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "TSInterfaceDeclaration[id.name=/DTO$/i]",
          message:
            "Shared DTO interfaces must be declared in packages/types and imported via @repo/types.",
        },
        {
          selector: "TSTypeAliasDeclaration[id.name=/DTO$/]",
          message:
            "DTO type aliases must live in packages/types and be imported via @repo/types.",
        },
      ],
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: [
                "../**/types",
                "../**/types/*",
                "**/packages/types",
                "**/packages/types/*",
              ],
              message: "Import shared contracts from @repo/types instead of using relative paths.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["packages/types/**/*"],
    rules: {
      "no-restricted-syntax": "off",
      "no-restricted-imports": "off",
    },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    ignores: ["dist/**"],
  },
];
