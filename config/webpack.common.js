
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
    rules: [{
      test: /\.js$/,
      exclude: /(node_modules|bower_components)/,
      loader: 'babel-loader',
      options: {
        cacheDirectory: true,
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
  };
}

function resolve() {
  return {
    modules: ["bower_components", "node_modules"],
  };
}

function replaceVersion(version) {
  return {
    test: /defaults\.json$/,
    use: [
      {
        loader: 'string-replace-loader',
        options: {
          search: '@@mvelo_version',
          replace: version
        }
      },
      {
        loader: 'json-loader'
      }
    ]
  };
}

exports.plugins = plugins;
exports.module = {react};
exports.resolve = resolve;
exports.replaceVersion = replaceVersion;
