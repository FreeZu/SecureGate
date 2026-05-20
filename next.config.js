/** @type {import('next').NextConfig} */

// Security headers per security.md §8. Applied to every route.

const securityHeaders = [
  // Block embedding in iframes — clickjacking mitigation.
  { key: "X-Frame-Options", value: "DENY" },
  // Disable MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send origin only on cross-origin navigation; no referrer on downgrades.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Lock down powerful APIs we never use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // 2-year HSTS with preload eligibility. Vercel serves HTTPS by default so
  // this is safe from day one. Submit to hstspreload.org once domain stable.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
