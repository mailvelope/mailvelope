
var webpack = require('webpack');

function plugins(env) {
  return [
    function() {
      this.plugin('done', function(stats) {
        if (stats.compilation.errors && stats.compilation.errors.length && process.argv.indexOf('--watch') == -1) {
          process.exitCode = 1;
        }
      });
    },
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify(env)
      }
    })
  ];
}

function react() {
  return {
    loaders: [{
      test: /\.js$/,
      exclude: /(node_modules|bower_components)/,
      loader: 'babel',
      query: {
        cacheDirectory: true,
        presets: ['react'],
        plugins: ['babel-plugin-transform-es2015-modules-commonjs',
                  'transform-es2015-parameters',
                  'transform-es2015-destructuring'
        ]
      }
    },
    {
      test: /\.css$/,
      loader: 'style!css?-url'
    }]
  };
}

exports.plugins = plugins;
exports.module = {react};
