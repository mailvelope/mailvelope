/* eslint strict: 0 */
'use strict';

const path = require('path');
const common = require('./webpack.common');

const conf = {
  ...common.prod,
  mode: 'development',
  devtool: 'inline-source-map'
};

conf.externals = {
  jquery: 'jQuery'
};

conf.resolve = {
  modules: [path.resolve('./src'), 'node_modules'],
  alias: {
    'emailjs-stringencoding': path.resolve('./src/lib/string-encoding'),
    'text-encoding': path.resolve('./src/lib/string-encoding'),
    test$: path.resolve('./test/test.js'),
    utils$: path.resolve('./test/utils.js'),
    Fixtures: path.resolve('./test/fixtures/')
  }
};

conf.output = {
  devtoolModuleFilenameTemplate: '[namespace]/[resource-path]?[loaders]'
};

conf.module = common.module.react();
conf.module.rules[0].options.plugins.push('babel-plugin-rewire');

module.exports = conf;
