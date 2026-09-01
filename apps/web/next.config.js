/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@ecommerce/types', '@ecommerce/config', '@ecommerce/ui'],
  output: process.env.NEXT_STANDALONE === '1' || process.env.NEXT_STANDALONE === 'true' ? 'standalone' : undefined,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb',
    },
  },
};

module.exports = nextConfig;
