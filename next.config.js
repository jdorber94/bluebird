/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure CSS processing is enabled
  webpack: (config) => {
    return config;
  }
}

module.exports = nextConfig 