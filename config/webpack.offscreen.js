/* eslint strict: 0 */
'use strict';

const path = require('path');
const common = require('./webpack.common');

const entry = './src/lib/offscreen/offscreen.js';
const output = {
  path: path.resolve('./build/tmp/lib/offscreen'),
  pathinfo: true,
  filename: 'offscreen.bundle.js'
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

