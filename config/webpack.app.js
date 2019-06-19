/* eslint strict: 0 */
'use strict';

const path = require('path');
const common = require('./webpack.common');

const entry = ['./src/app/router.js'];
const output = {
  path: path.resolve('./build/tmp/app'),
  pathinfo: true,
  filename: 'app.bundle.js'
};
const externals = {
  react: 'React',
  'react-dom': 'ReactDOM'
};

const prod = {
  ...common.prod,
  entry,
  output,
  resolve: common.resolve(),
  externals,
  module: {
    rules: [...common.module.react(), ...common.module.css(), ...common.module.scss()]
  }
};

const dev = {
  ...prod,
  mode: 'development',
  devtool: 'inline-cheap-module-source-map'
};

module.exports = [dev];

module.exports.prod = prod;
module.exports.dev = dev;
