const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// "New folder" is a separate, unrelated web project living inside this repo (not part of the
// Expo app). Exclude it so Metro doesn't scan its files - e.g. its .ts file, which otherwise
// makes Metro incorrectly demand TypeScript deps for this JS-only Expo project.
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : [config.resolver.blockList]),
  /[\\/]New folder[\\/].*/,
];

module.exports = config;
