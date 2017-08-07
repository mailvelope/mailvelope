/* eslint strict: 0 */
'use strict';

const path = require('path');
const common = require('./webpack.common');

const entry = './src/content-scripts/main.js';
const output = {
  path: path.resolve('./build/tmp/content-scripts'),
  pathinfo: true,
  filename: 'cs-mailvelope.js'
};
const resolve = {
  alias: {
    'jquery': path.resolve('./node_modules/jquery/dist/jquery.min.js')
  }
};

exports.prod = {

  entry,
  output,
  resolve,
  plugins: common.plugins('production')

};

exports.dev = {

  devtool: 'inline-source-map',

  entry,
  output,
  resolve,
  plugins: common.plugins('development')

};

