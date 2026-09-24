const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// Shared workspace packages carry their own dev copies of these (web's React minor); the app
// must use exactly one instance, or hooks and TanStack Query contexts break.
const SINGLETONS = ['react', 'react-dom', 'react-native', '@tanstack/react-query'];
const appOrigin = path.join(__dirname, 'package.json');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const shared = SINGLETONS.some((m) => moduleName === m || moduleName.startsWith(`${m}/`));
  return context.resolveRequest(
    shared ? { ...context, originModulePath: appOrigin } : context,
    moduleName,
    platform,
  );
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  dtsFile: './src/uniwind-types.d.ts',
});
