const CONFIGS = {
  test: {
    presets: [
      ['@babel/preset-env', {
        modules: 'commonjs',
        targets: [
          'last 2 versions'
        ]
      }]
    ]
  },
  build: {
    plugins: ['@babel/plugin-transform-runtime'],
    presets: [
      ['@babel/preset-env', {
        modules: 'auto',
        targets: [
          'last 2 versions'
        ]
      }]
    ]
  }
};

let envConfig;
switch (process.env.NODE_ENV) {
  case 'test':
    envConfig = CONFIGS.test;
    break;
  case 'build':
  default:
    envConfig = CONFIGS.build;
}

module.exports = envConfig;
