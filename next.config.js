/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure CSS processing is enabled
  webpack: (config) => {
    return config;
  },
  // Disable CSS optimization in production to troubleshoot
  optimizeCss: false,
}

module.exports = nextConfig 