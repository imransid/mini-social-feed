import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // These are integration tests against a real Postgres database. Running the
    // files sequentially keeps concurrent suites from contending on the same
    // tables; each file also namespaces its own fixtures by username prefix.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
