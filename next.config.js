/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
      },
      {
        protocol: 'https',
        hostname: '**.imdb.com',
      },
      {
        protocol: 'https',
        hostname: '**.media-amazon.com',
      },
    ],
  },
};

module.exports = nextConfig;
