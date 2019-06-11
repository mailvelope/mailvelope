/* eslint strict: 0 */
'use strict';

const path = require('path');
const common = require('./webpack.common');

const entry = './src/client-API/main.js';
const output = {
  path: path.resolve('./build/tmp/client-API'),
  pathinfo: true,
  filename: 'mailvelope-client-api.js'
};

exports.prod = {
  ...common.prod,
  entry,
  output
};

exports.dev = {
  ...exports.prod,
  mode: 'development',
  devtool: 'inline-cheap-module-source-map'
};

