import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: false,
  // Uploaded product images are served from the database via /api/uploads/[id]
  // Basic hardening headers on every response
  async headers() {
    const security = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
      ...(process.env.NODE_ENV === 'production'
        ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
        : []),
    ]
    return [{ source: '/:path*', headers: security }]
  },
  async rewrites() {
    return [{ source: '/uploads/:id', destination: '/api/uploads/:id' }]
  },
  images: {
    // Allow admin-added product images from any https source
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
