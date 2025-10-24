/** @type {import('next').NextConfig} */
const nextConfig = {
	images: {
		remotePatterns: [
			{ protocol: 'https', hostname: '**' },
			{ protocol: 'http', hostname: '**' },
		],
	},
  experimental: {
    // Ensure Turbopack/Next treats this native module as external for server components
    serverComponentsExternalPackages: ['stockfish'],
  },
};

export default nextConfig;
