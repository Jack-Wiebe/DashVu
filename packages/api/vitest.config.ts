import { defineConfig } from "vitest/config";

export default defineConfig({
  ssr: {
    resolve: {
      // Vitest forwards these to its workers as --conditions flags, so natively
      // imported dependencies resolve conditional exports for the test process.
      // `server-only` maps react-server to an empty module, which keeps its
      // throwing default entry out of tests that import server-only modules.
      conditions: ["react-server"],
    },
  },
});
