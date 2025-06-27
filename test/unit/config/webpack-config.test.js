// Mock the sass-json-importer dependency that's used in webpack.common.js
jest.mock('@blakedarlin/sass-json-importer', () => () => ({}), {virtual: true});

describe('Webpack Configuration Security', () => {
  it('should not define __DEV_MODE__ in production configs', () => {
    const prodConfig = require('../../../config/webpack.prod');
    // Check that no production config defines __DEV_MODE__
    prodConfig.forEach(config => {
      const definePlugin = config?.plugins?.find(p => p.constructor.name === 'DefinePlugin');
      if (definePlugin) {
        expect(definePlugin.definitions).not.toHaveProperty('__DEV_MODE__');
      }
    });
  });

  it('should define __DEV_MODE__ as true in test config', () => {
    const testConfig = require('../../../config/webpack.test.integration');
    const definePlugin = testConfig.plugins.find(p => p.constructor.name === 'DefinePlugin');
    expect(definePlugin).toBeDefined();
    expect(definePlugin.definitions.__DEV_MODE__).toBe('true');
  });

  it('should not define __DEV_MODE__ in development configs', () => {
    const devConfig = require('../../../config/webpack.dev');
    // Check that no development config defines __DEV_MODE__
    devConfig.forEach(config => {
      const definePlugin = config?.plugins?.find(p => p.constructor.name === 'DefinePlugin');
      if (definePlugin) {
        expect(definePlugin.definitions).not.toHaveProperty('__DEV_MODE__');
      }
    });
  });
});
