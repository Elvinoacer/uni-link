module.exports = function (api) {
  api.cache(true);

  // Ensure EXPO_ROUTER_APP_ROOT is set. This acts as a fallback if the 
  // expo-router babel plugin fails to resolve it from the caller options.
  process.env.EXPO_ROUTER_APP_ROOT = process.env.EXPO_ROUTER_APP_ROOT || "./app";

  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxImportSource: 'nativewind',
        },
      ],
    ],
    plugins: [
      function({ types: t }) {
        return {
          visitor: {
            MemberExpression(path) {
              if (path.get('object').matchesPattern('process.env') && path.toComputedKey()) {
                const key = path.toComputedKey().value;
                if (key === 'EXPO_ROUTER_APP_ROOT') {
                  // The path must be relative to where the require.context call happens
                  // _ctx.web.js is in node_modules/expo-router
                  // So we need to go up 2 levels (../../) to get to project root, then into app
                  path.replaceWith(t.stringLiteral("../../app"));
                }
                if (key === 'EXPO_ROUTER_IMPORT_MODE') {
                  path.replaceWith(t.stringLiteral("sync"));
                }
              }
            }
          }
        };
      },
      [
        'module-resolver',
        {
          alias: {
            'socket.io-client': 'socket.io-client/build/cjs/index.js',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
