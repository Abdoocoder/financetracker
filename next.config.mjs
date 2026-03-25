/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  serverExternalPackages: ['firebase-admin'],
  turbopack: {},
};

export default nextConfig;
