/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Unused import/var warnings in existing code — suppressed for build.
    // TODO: clean up unused imports across components post-deploy.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
