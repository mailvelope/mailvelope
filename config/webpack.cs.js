
'use strict';

var path = require('path');
var common = require('./webpack.common');

const entry = './src/content-scripts/main.js';
const output = {
  path: path.resolve('./build/tmp/content-scripts'),
  pathinfo: true,
  filename: 'cs-mailvelope.js'
};
const resolve = {
  alias: {
    'jquery': path.resolve('./bower_components/jquery/dist/jquery.min.js')
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

