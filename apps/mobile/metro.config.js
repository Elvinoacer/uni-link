const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Force set the transformerPath to Expo's transform-worker.
// This is critical because NativeWind's css-interop wraps this.
// We must ensure it points to the worker (which handles the router context) 
// and NOT the babel-transformer directly.
config.transformerPath = require.resolve(
  "@expo/metro-config/build/transform-worker/transform-worker"
);

// Ensure EXPO_ROUTER_APP_ROOT is set in the Metro process
process.env.EXPO_ROUTER_APP_ROOT = process.env.EXPO_ROUTER_APP_ROOT || "./app";

module.exports = withNativeWind(config, { input: "./global.css" });



