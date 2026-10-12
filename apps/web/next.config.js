const path = require("path");
const { loadEnvConfig } = require("@next/env");

loadEnvConfig(
  path.resolve(__dirname, "../../"),
  process.env.NODE_ENV === "development",
  undefined,
  true
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@dashvu/ui", "@dashvu/validators", "@dashvu/core"],
};

module.exports = nextConfig;
