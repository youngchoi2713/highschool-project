/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "nguhqptxczdrwcbllqml.supabase.co",
      },
    ],
  },
};

export default nextConfig;
