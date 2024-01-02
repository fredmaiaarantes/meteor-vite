Package.describe({
  name: 'jorgenvatle:vite-bundler',
  version: '1.9.1',
  summary: 'Integrate the Vite.js bundler with Meteor',
  git: 'https://github.com/JorgenVatle/meteor-vite',
  documentation: 'README.md',
})

Package.registerBuildPlugin({
  name: 'vite',
  use: [
    'ecmascript',
    'caching-compiler',
    'babel-compiler',
    'typescript',
  ],
  sources: [
    'build.js',
    'workers.ts',
  ],
  npmDependencies: {
    execa: '6.1.0',
    'fs-extra': '10.1.0',
    'picocolors': '1.0.0',
  },
})

Npm.depends({
  'picocolors': '1.0.0',
});

Package.onUse(function(api) {
  api.versionsFrom(['1.9', '2.3', '2.12']);
  api.use([
      'fetch',
      'webapp',
      'ecmascript',
      'typescript',
      'isobuild:compiler-plugin@1.0.0',
  ]);
  api.use([
      'zodern:types@1.0.9',
  ], {
      weak: true,
  })
  api.addAssets(['loading/dev-server-splash.html'], 'server');
  api.mainModule('client.ts', 'client');
  api.mainModule('vite-server.ts', 'server')
})

