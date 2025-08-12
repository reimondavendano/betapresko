/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@radix-ui/react-progress'],
  experimental: {
    esmExternals: 'loose', // helps with some Radix ESM imports
  },
  // output: 'export',
  // reactStrictMode: true,
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
  // images: { unoptimized: true },
};

module.exports = nextConfig;
