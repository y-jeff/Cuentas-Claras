import type { NextConfig } from "next";

// URL interna del backend Django. Se lee en build: los rewrites quedan fijados en el bundle.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  agentRules: false,
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
  async redirects() {
    return [{ source: "/", destination: "/dashboard", permanent: false }];
  },
  // El navegador solo habla con el dominio del frontend; Next reenvía /api/* a Django.
  // Así las cookies de sesión son first-party (HttpOnly + SameSite=Lax) y no hace falta CORS.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
  },
};

export default nextConfig;
