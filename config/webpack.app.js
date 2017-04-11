
'use strict';

var path = require('path');
var common = require('./webpack.common');

const entry = './src/app/app.js';
const output = {
  path: path.resolve('./build/tmp/app'),
  pathinfo: true,
  filename: 'app.bundle.js'
};
const externals = {
  jquery: 'jQuery',
  react: 'React',
  'react-dom': 'ReactDOM'
};

const prod = {

  entry,
  output,
  resolve: common.resolve(),
  externals,
  module: common.module.react(),
  plugins: common.plugins('production')

};

const dev = {

  devtool: 'cheap-source-map',
  entry,
  output,
  resolve: common.resolve(),
  externals,
  module: common.module.react(),
  plugins: common.plugins('development')

};

module.exports = [dev];

module.exports.prod = prod;
module.exports.dev = dev;
