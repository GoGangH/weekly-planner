import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/weekly',
        destination: '/calendar',
        permanent: true,
      },
      {
        source: '/daily/:date',
        destination: '/calendar?date=:date&view=day',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
