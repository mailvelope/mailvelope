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
  return Object.assign(prod(pathname, filename), {
    devtool: 'inline-source-map',
    plugins: common.plugins('development')
  });
}

module.exports = [dev('editor', 'editor')];

module.exports.prod = [prod('editor', 'editor')];
module.exports.dev = module.exports;
