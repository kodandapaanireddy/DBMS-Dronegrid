/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Plain JavaScript — no TypeScript, no SWC type-checking.
  // Routes are .js / .jsx only.
  experimental: {
    // Allow large request bodies for telemetry batch ingest.
    // (Next 14 stable API; kept for clarity.)
  },
  // CORS: allow the simulator's machine and any local dev host.
  // In production set a strict allowlist instead.
  async headers() {
    return [
      {
        // Allow fetch from any localhost / private IP during development.
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
};

export default nextConfig;
