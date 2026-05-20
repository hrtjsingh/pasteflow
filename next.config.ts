type WebpackOptimization = { runtimeChunk?: boolean | 'single' | 'multiple' };
type WebpackConfig = {
  devtool?: string | false;
  optimization?: WebpackOptimization;
  plugins?: unknown[];
};

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  // Keep webpack dev source maps CSP-friendly; retain Fast Refresh plugin (CSP allows unsafe-eval in dev via middleware).
  webpack: (config: WebpackConfig, { dev, isServer }: { dev: boolean; isServer: boolean }) => {
    if (dev && !isServer) {
      config.devtool = 'cheap-module-source-map';
    }

    if (!config.optimization) config.optimization = {};
    if (dev) {
      config.optimization.runtimeChunk = false;
    }

    return config;
  },
  // Empty Turbopack config silences Next 16 default Turbopack warning when using webpack flag
  turbopack: {},
};

export default nextConfig;
