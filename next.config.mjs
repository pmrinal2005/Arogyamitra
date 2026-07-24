/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // Leaflet + react-leaflet ship ESM that Next transpiles fine; recharts is fine too.
  transpilePackages: ["react-leaflet", "leaflet"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
