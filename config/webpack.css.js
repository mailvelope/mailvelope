/* eslint strict: 0 */
'use strict';

const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const common = require('./webpack.common');

const entry = './src/main.scss';
const output = {
  path: path.resolve('./build/tmp'),
  pathinfo: true
};

exports.prod = {
  ...common.prod,
  entry,
  output,
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css'
    })
  ],
  module: common.module.scss(MiniCssExtractPlugin.loader)
};

exports.dev = {
  ...exports.prod,
  mode: 'development',
  devtool: 'inline-source-map'
};
