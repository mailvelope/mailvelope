
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
  return {

    devtool: 'inline-source-map',

    entry: `./src/components/${pathname}/${filename}`,

    output: {
      path: path.resolve(`./build/tmp/components/${pathname}`),
      pathinfo: true,
      filename: `${filename}.bundle.js`
    },

    resolve: common.resolve(),

    externals,
    module: common.module.react(),
    plugins: common.plugins('development')

  };
}

module.exports = [dev('editor', 'editor')];

module.exports.prod = [prod('editor/components', 'EditorFooter')];
module.exports.dev = module.exports;
