
'use strict';

var webpack = require('webpack');

module.exports = {

  devtool: 'source-map',

  entry: ['./src/app/app.js'], // [] due to https://github.com/webpack/webpack/issues/300

  output: {
    path: './build/tmp/app',
    pathinfo: true,
    filename: 'app.bundle.js'
  },

  resolve: {
    modulesDirectories: ["bower_components", "node_modules"]
  },

  externals: {
    jquery: 'jQuery'
  },

  module: {
    loaders: [{
      test: /\.js$/,
      exclude: /(node_modules|bower_components)/,
      loader: 'babel',
      query: {
        cacheDirectory: true,
        presets: ['react'],
        plugins: ['babel-plugin-transform-es2015-modules-commonjs']
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
        'NODE_ENV': JSON.stringify('development')
      }
    })
  ]

};
