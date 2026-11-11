import type { NextConfig } from 'next';

// When the site is served from a sub-folder (GitHub Pages project sites live at
// https://<user>.github.io/<repo>/) the workflow sets NEXT_PUBLIC_BASE_PATH to "/<repo>".
// Locally and on Vercel / Netlify it stays empty.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const nextConfig: NextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  reactStrictMode: true,
  images: { unoptimized: true },
  allowedDevOrigins: ['*.e2b.app'],
  sassOptions: { silenceDeprecations: ['legacy-js-api'] },
};

export default nextConfig;
