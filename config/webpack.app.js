
'use strict';

var common = require('./webpack.common');
var path = require('path');

const entry = ['./src/app/app.js']; // [] due to https://github.com/webpack/webpack/issues/300
const output = {
  path: './build/tmp/app',
  pathinfo: true,
  filename: 'app.bundle.js'
};
const externals = {
  jquery: 'jQuery'
};

exports.prod = {

  entry,
  output,

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

exports.dev = {

  devtool: 'source-map',
  entry,
  output,

  resolve: {
    modulesDirectories: ["bower_components", "node_modules"]
  },

  externals,
  module: common.module.react(),
  plugins: common.plugins('development')

};
