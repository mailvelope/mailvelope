
'use strict';

var common = require('./webpack.common');
var path = require('path');

module.exports = {

  devtool: 'cheap-module-source-map',

  entry: './test/test.js',

  output: {
    path: path.resolve('./build/test'),
    pathinfo: true,
    filename: 'test.bundle.js'
  },

  resolve: {
    modules: ["bower_components", "node_modules"],
    alias: {
      'lib-mvelo': path.resolve('./src/chrome/lib/lib-mvelo'),
      openpgp: path.resolve('./dep/chrome/openpgpjs/dist/openpgp'),
      'mailreader-parser': path.resolve('./node_modules/mailreader/src/mailreader-parser'),
      'emailjs-stringencoding': path.resolve('./src/chrome/lib/emailjs-stringencoding')
    }
  },

  externals: {
    jquery: 'jQuery'
  },

  module: {
    rules: [{
      test: /\.js$/,
      exclude: /(node_modules|bower_components)/,
      loader: 'babel-loader',
      options: {
        presets: ['babel-preset-es2015', 'react']
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
