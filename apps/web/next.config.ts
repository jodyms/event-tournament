import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['ckeditor5', '@ckeditor/ckeditor5-react'],
  turbopack: { root: __dirname },
};

export default nextConfig;
