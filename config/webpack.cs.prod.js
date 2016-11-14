
'use strict';

var webpack = require('webpack');
var path = require('path');

module.exports = {

  entry: ['./src/content-scripts/main.js'], // [] due to https://github.com/webpack/webpack/issues/300

  output: {
    path: './build/tmp/content-scripts',
    pathinfo: true,
    filename: 'cs-mailvelope.js'
  },

  resolve: {
    alias: {
      'jquery': path.resolve('./bower_components/jquery/dist/jquery.min.js')
    }
  },

  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /(node_modules|bower_components)/,
      loader: 'babel',
      query: {
        plugins: ['babel-plugin-transform-es2015-modules-commonjs',
                  'transform-es2015-parameters',
                  'transform-es2015-destructuring'
        ]
      }
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
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      }
    })
  ]

};
