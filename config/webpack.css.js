/* eslint strict: 0 */
'use strict';

const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const common = require('./webpack.common');

const fs = require('fs');
const pathToStyles = './src/res/styles';
const entries = fs.readdirSync(pathToStyles).filter(file => file.match(/\.css$/)).map(file => `${pathToStyles}/${file}`);
entries.push('./src/main.scss');

const output = {
  path: path.resolve('./build/tmp'),
  pathinfo: true,
};

exports.prod = {
  ...common.prod,
  entry: entries,
  output,
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
      publicPath: './src'
    })
  ],
  module: common.module.scss(MiniCssExtractPlugin.loader, true)
};

exports.dev = {
  ...exports.prod,
  mode: 'development',
  devtool: 'inline-source-map'
};
