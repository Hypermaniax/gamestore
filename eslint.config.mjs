import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Project tooling / generated code that is not application source:
    ".agents/**",
    "generated/**",
  ]),
  {
    files: ["app/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/src/lib/prisma",
                "**/lib/prisma",
                "@/src/repositories/*",
                "**/repositories/*",
                "@/generated/*",
                "**/generated/*",
                "@/src/lib/cache/*",
                "**/lib/cache/*",
                "pg",
                "@prisma/client",
              ],
              message:
                "Server components must call a service in src/services; do not import Prisma, repositories, or cache directly.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
