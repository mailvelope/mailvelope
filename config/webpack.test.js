/* eslint strict: 0 */
'use strict';

const path = require('path');
const common = require('./webpack.common');
const externals = {
  jquery: 'jQuery',
};

const resolve = {
  modules: [path.resolve('./src'), 'node_modules'],
  alias: {
    'mailreader-parser': path.resolve('./node_modules/mailreader/src/mailreader-parser'),
    'test': path.resolve('./test/test.js')
  }
};

const output = {
  devtoolModuleFilenameTemplate: '[namespace]/[resource-path]?[loaders]'
};

const wModule = common.module.react();
wModule.rules[0].options.plugins.push('babel-plugin-rewire');

module.exports = {...common.prod,
  mode: 'development',
  devtool: 'inline-source-map',
  output,
  resolve,
  externals,
  module: wModule
};
