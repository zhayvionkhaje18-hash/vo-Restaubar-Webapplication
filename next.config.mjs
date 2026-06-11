/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Transpile sonner so Next.js processes its React JSX imports correctly (fixes jsx-dev-runtime module factory error)
  transpilePackages: ["sonner"],
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
}

export default nextConfig
