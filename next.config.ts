import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cxmowfmjpctftybzvuzi.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  devIndicators: {
    buildActivity: false,
    autoPrerender: false, // Disables the prerender indicator (lightning bolt)
  },
};

export default nextConfig;
