/// <reference types="vitest" />
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: [
        "node_modules/",
        "tests/",
        "**/*.d.ts",
        "**/*.config.*",
        "site/src/lib/wasm/**", // WASM modules
        "site/dist/**",
        "studio/dist/**",
      ],
    },
    // Configure test file patterns
    include: [
      "tests/**/*.{test,spec}.{js,ts}",
      "site/src/**/*.{test,spec}.{js,ts}",
      "studio/**/*.{test,spec}.{js,ts}",
    ],
    exclude: [
      "node_modules",
      "site/dist",
      "studio/dist",
      "site/src/lib/wasm/**",
    ],
  },
  resolve: {
    alias: {
      "@site": new URL("./site/src", import.meta.url).pathname,
      "@studio": new URL("./studio", import.meta.url).pathname,
      "@tests": new URL("./tests", import.meta.url).pathname,
    },
  },
});
