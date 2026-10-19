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
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    unoptimized: true,
  },
  transpilePackages: [
    "@dashvu/ui",
    "@dashvu/validators",
    "@dashvu/core",
    "@dashvu/api",
    "@dashvu/db",
  ],
};

module.exports = nextConfig;
