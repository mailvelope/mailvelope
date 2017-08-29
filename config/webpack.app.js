/* eslint strict: 0 */
'use strict';

const path = require('path');
const common = require('./webpack.common');

const entry = './src/app/router.js';
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

const dev = Object.assign(prod, {
  devtool: 'source-map',
  plugins: common.plugins('development')
});

module.exports = [dev];

module.exports.prod = prod;
module.exports.dev = dev;
