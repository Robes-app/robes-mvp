const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

// Workspace packages carry their own devDependency copies; one runtime copy of each singleton.
const SINGLETONS = new Set([
  'react',
  'react-native',
  'react-native-svg',
  'expo-haptics',
  'expo-image',
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
