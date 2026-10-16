const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// Workspace packages carry their own dev copies (web's React minor); the app must resolve exactly
// one instance of each singleton, or hooks, contexts and TanStack Query break.
const SINGLETONS = new Set([
  'react',
  'react-native',
  'react-native-svg',
  'expo-haptics',
  'expo-image',
  'react-dom',
  '@tanstack/react-query',
]);
const appOrigin = path.join(__dirname, 'package.json');
const upstream = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const parts = moduleName.split('/');
  const pkg = moduleName.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  const next = SINGLETONS.has(pkg) ? { ...context, originModulePath: appOrigin } : context;
  return (upstream ?? context.resolveRequest)(next, moduleName, platform);
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  dtsFile: './src/uniwind-types.d.ts',
});
