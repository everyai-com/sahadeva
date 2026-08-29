import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["shared/**/*.test.ts", "worker/**/*.test.ts"],
    // Astronomy fixtures are CPU-bound; file-level parallelism makes otherwise
    // sub-second assertions contend for the same core and creates false timeouts.
    fileParallelism: false,
  },
});
