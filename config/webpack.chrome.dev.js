
'use strict';

var path = require('path');
var webpack = require('webpack');

module.exports = {

  devtool: 'cheap-module-source-map',

  entry: './src/chrome/background.js',

  output: {
    path: './build/chrome',
    pathinfo: true,
    filename: 'background.bundle.js'
  },

  resolve: {
    modulesDirectories: ["bower_components", "node_modules"],
    alias: {
      'lib-mvelo': path.resolve('./src/chrome/lib/lib-mvelo'),
      openpgp: path.resolve('./dep/chrome/openpgpjs/dist/openpgp'),
      'mailreader-parser': path.resolve('./node_modules/mailreader/src/mailreader-parser'),
      'emailjs-stringencoding': path.resolve('./src/chrome/lib/emailjs-stringencoding')
    }
  },

  module: {
    loaders: [{
      test: /\.json$/,
      loader: 'json'
    }]
  },

  plugins: [
    function() {
      this.plugin('done', function(stats) {
        if (stats.compilation.errors && stats.compilation.errors.length && process.argv.indexOf('--watch') == -1) {
          process.exitCode = 1;
        }
      });
    },
    new webpack.DefinePlugin({
      'process.env':{
        'NODE_ENV': JSON.stringify('development')
      }
    })
  ]

};
