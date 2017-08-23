/* eslint strict: 0 */
'use strict';

const common = require('./webpack.common');
const path = require('path');

module.exports = {

  devtool: 'cheap-module-source-map',

  entry: './test/test.js',

  output: {
    path: path.resolve('./build/test'),
    pathinfo: true,
    filename: 'test.bundle.js'
  },

  resolve: {
    modules: ["node_modules"],
    alias: {
      'mailreader-parser': path.resolve('./node_modules/mailreader/src/mailreader-parser'),
      'emailjs-stringencoding': path.resolve('./src/lib/emailjs-stringencoding')
    }
  },

  externals: {
    jquery: 'jQuery'
  },

  module: {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader',
      options: {
        presets: ['react']
      }
    },
    {
      test: /\.css$/,
      use: [{
        loader: 'style-loader'
      },
      {
        loader: 'css-loader',
        options: {
          url: false
        }
      }]
    }]
  },

  plugins: common.plugins('development')

};
