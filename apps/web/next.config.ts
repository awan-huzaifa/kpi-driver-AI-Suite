import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@kpidriver/auth', '@kpidriver/stripe', 'framer-motion'],
  serverExternalPackages: ['@react-pdf/renderer'],
  // Migrated apps have pre-existing TS issues from looser original configs — fix incrementally
  typescript: { ignoreBuildErrors: true },
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
}

export default nextConfig
