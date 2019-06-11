/* eslint strict: 0 */
'use strict';

const path = require('path');
const common = require('./webpack.common');
const pjson = require('../package.json');

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
  ...common.prod,
  entry,
  output,
  resolve,
  module: {
    rules: [common.replaceVersion(/main\.js$/, pjson.version)]
  }
};

exports.dev = {
  ...exports.prod,
  mode: 'development',
  devtool: 'inline-cheap-module-source-map'
};

