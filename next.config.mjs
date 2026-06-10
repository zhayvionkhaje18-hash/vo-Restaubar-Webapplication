/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Allow menu image uploads up to 6MB through server actions
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
}

export default nextConfig
