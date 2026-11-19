import { defineConfig } from "vitest/config";
import config from "./tsconfig.json";
import { resolve } from "node:path";
export default defineConfig({
  resolve: {
    alias: Object.fromEntries(
      Object.entries(config.compilerOptions.paths).map(([k, v]) => [
        k,
        resolve(v[0]!),
      ]),
    ),
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
