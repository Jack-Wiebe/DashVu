import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // server-only's default entry throws outside React's server runtime; tests run
    // in plain Node, so resolve its react-server (empty) entry instead.
    conditions: ["react-server"],
  },
});
