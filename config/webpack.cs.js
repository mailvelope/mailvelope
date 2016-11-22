
'use strict';

var path = require('path');
var common = require('./webpack.common');

const entry = ['./src/content-scripts/main.js']; // [] due to https://github.com/webpack/webpack/issues/300
const output = {
  path: './build/tmp/content-scripts',
  pathinfo: true,
  filename: 'cs-mailvelope.js'
};
const resolve = {
  alias: {
    'jquery': path.resolve('./bower_components/jquery/dist/jquery.min.js')
  }
};
const wp_module = {
  loaders: [{
    test: /\.js$/,
    exclude: /(node_modules|bower_components)/,
    loader: 'babel',
    query: {
      cacheDirectory: true,
      plugins: ['babel-plugin-transform-es2015-modules-commonjs',
                'transform-es2015-parameters',
                'transform-es2015-destructuring'
      ]
    }
  }]
};

exports.prod = {

  entry,
  output,
  resolve,
  module: wp_module,
  plugins: common.plugins('production')

};

exports.dev = {

  devtool: 'inline-source-map',

  entry,
  output,
  resolve,
  module: wp_module,
  plugins: common.plugins('development')

};

