import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

// Same-origin API (FE-23): the browser only talks to this server, which proxies /api/v1/* to Django
// over the private network, so the refresh cookie stays first-party. Read at build time.
const backendUrl = (process.env.BACKEND_INTERNAL_URL || "http://localhost:8000").replace(/\/$/, "");

const nextConfig: NextConfig = {
  // Django uses APPEND_SLASH; let every /api/v1 path reach it with exactly one trailing slash.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      { source: "/api/v1/:path*/", destination: `${backendUrl}/api/v1/:path*/` },
      { source: "/api/v1/:path*", destination: `${backendUrl}/api/v1/:path*/` },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withSerwist(nextConfig);

