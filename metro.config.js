const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add web-specific configurations
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Add alias for web fallbacks and @ path alias
config.resolver.alias = {
  ...config.resolver.alias,
  '@': path.resolve(__dirname),
};

// Configure transformer for web compatibility
config.transformer = {
  ...config.transformer,
  assetPlugins: ['expo-asset/tools/hashAssetFiles'],
};

// Add resolver fields for web compatibility
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;
