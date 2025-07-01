/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove proxy rewrites since we're making direct calls
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
