import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com",
  "font-src 'self' data:",
  "connect-src 'self' https://api.xendit.co" + (isProd ? "" : " ws: wss:"),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      { source: "/akun-game/:slug", destination: "/accounts/:slug", permanent: true },
      { source: "/akun", destination: "/account", permanent: true },
      { source: "/pesanan", destination: "/orders", permanent: true },
      { source: "/pesanan/:code", destination: "/orders/:code", permanent: true },
      { source: "/halaman/syarat-ketentuan", destination: "/pages/terms-and-conditions", permanent: true },
      { source: "/halaman/privasi", destination: "/pages/privacy", permanent: true },
      { source: "/halaman/garansi", destination: "/pages/warranty", permanent: true },
      { source: "/halaman/:code", destination: "/pages/:code", permanent: true },
      { source: "/pages/syarat-ketentuan", destination: "/pages/terms-and-conditions", permanent: true },
      { source: "/pages/privasi", destination: "/pages/privacy", permanent: true },
      { source: "/pages/garansi", destination: "/pages/warranty", permanent: true },
      { source: "/daftar", destination: "/register", permanent: true },
      { source: "/lupa-password", destination: "/forgot-password", permanent: true },
      { source: "/verifikasi-email", destination: "/verify-email", permanent: true },
      { source: "/ganti-email/konfirmasi", destination: "/change-email/confirm", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
