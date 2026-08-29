import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Cloudflare Workers requires outputting standalone builds
  // OpenNext handles this, but we set trailingSlash for consistency
  trailingSlash: false,
}

export default nextConfig
