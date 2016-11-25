
'use strict';

var common = require('./webpack.common');
var path = require('path');

const externals = {
  jquery: 'jQuery'
};

function prod(pathname, filename) {
  return {

    entry: './src/components/' + pathname + '/' + filename,

    output: {
      path: './build/tmp/components/' + pathname,
      pathinfo: true,
      filename: filename + '.bundle.js'
    },

    resolve: {
      modulesDirectories: ["bower_components", "node_modules"],
      alias: {
        'react': path.resolve('./node_modules/react/dist/react.min'),
        'react-dom': path.resolve('./node_modules/react-dom/dist/react-dom.min')
      }
    },

    externals,
    module: common.module.react(),
    plugins: common.plugins('production')

  };
}

function dev(pathname, filename) {
  return {

    devtool: 'inline-source-map',

    entry: './src/components/' + pathname + '/' + filename,

    output: {
      path: './build/tmp/components/' + pathname,
      pathinfo: true,
      filename: filename + '.bundle.js'
    },

    resolve: {
      modulesDirectories: ["bower_components", "node_modules"]
    },

    externals,
    module: common.module.react(),
    plugins: common.plugins('development')

  };
}

module.exports = [dev('editor', 'editor')];

module.exports.prod = [prod('editor/components', 'EditorFooter')];
module.exports.dev = module.exports;
