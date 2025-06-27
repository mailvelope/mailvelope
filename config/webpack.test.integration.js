/* eslint strict: 0 */
'use strict';

const path = require('path');
const webpack = require('webpack');
const common = require('./webpack.common');

// Base test configuration (merged from webpack.test.js)
const conf = {
  ...common.prod,
  mode: 'development',
  devtool: false,

  // Integration test specific entry and output
  entry: {
    'test-harness': path.resolve(__dirname, '../test/integration/setup/test-harness.js')
  },
  output: {
    path: path.resolve(__dirname, '../test/integration/.build'),
    filename: '[name].bundle.js',
    clean: true,
    devtoolModuleFilenameTemplate: '[namespace]/[resource-path]?[loaders]'
  },

  // Add DefinePlugin for development mode features
  plugins: [
    new webpack.DefinePlugin({
      '__DEV_MODE__': JSON.stringify(true)
    })
  ]
};

// Externals configuration
conf.externals = {
  jquery: 'jQuery'
};

// Resolve configuration
conf.resolve = {
  modules: [path.resolve('./src'), 'node_modules'],
  alias: {
    'text-encoding': path.resolve('./src/lib/string-encoding')
  }
};

// Module rules
conf.module = {rules: [...common.module.react(), ...common.module.css(), ...common.module.scss()]};
conf.module.rules.push(
  {
    test: /\.asc$/,
    type: 'asset/source'
  }
);

module.exports = conf;

