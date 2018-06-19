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

const prod = Object.assign({}, common.prod, {
  entry,
  output,
  resolve: common.resolve(),
  externals,
  module: common.module.react()
});

const dev = Object.assign({}, prod, {
  mode: 'development',
  devtool: 'source-map'
});

module.exports = [dev];

module.exports.prod = prod;
module.exports.dev = dev;
