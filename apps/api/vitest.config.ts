import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    noFileParallelism: true,
    setupFiles: ["./src/test/setup.ts"],
  },
});
