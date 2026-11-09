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
    // Vendored verbatim from the Atlas artifact - kept unmodified so it can be
    // re-synced. See engine/gf.ts for the typed wrapper we actually call.
    "engine/fig-core.js",
    "engine/fig-poses.js",
  ]),
]);

export default eslintConfig;
