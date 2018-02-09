/* eslint strict: 0 */
'use strict';

const path = require('path');
const common = require('./webpack.common');

const externals = {
  jquery: 'jQuery',
  react: 'React',
  'react-dom': 'ReactDOM'
};

function prod(pathname, filename) {
  return {
    entry: `./src/components/${pathname}/${filename}`,
    output: {
      path: path.resolve(`./build/tmp/components/${pathname}`),
      pathinfo: true,
      filename: `${filename}.bundle.js`
    },
    resolve: common.resolve(),
    externals,
    module: common.module.react(),
    plugins: common.plugins('production')
  };
}

function dev(pathname, filename) {
  return Object.assign({}, prod(pathname, filename), {
    devtool: 'inline-source-map',
    plugins: common.plugins('development')
  });
}

module.exports = [
  dev('action-menu', 'actionMenu'),
  dev('decrypt-message', 'decryptMessageRoot'),
  dev('editor', 'editorRoot'),
  dev('install-landing-page', 'installLandingPage')
];

module.exports.prod = [
  prod('action-menu', 'actionMenu'),
  prod('decrypt-message', 'decryptMessageRoot'),
  prod('editor', 'editorRoot'),
  prod('install-landing-page', 'installLandingPage')
];

module.exports.dev = module.exports;
