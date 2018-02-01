/* eslint strict: 0 */
const webpack = require('webpack');

function plugins(env) {
  return [
    function() {
      this.plugin('done', stats => {
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
      exclude: /node_modules/,
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
    },
    {
      test: /\.less$/,
      use: [{
        loader: "style-loader"
      }, {
        loader: "css-loader"
      }, {
        loader: "less-loader"
      }]
    },
    {
      test: /\.(woff2?|ttf|svg|eot)(\?v=\d+\.\d+\.\d+)?$/,
      loader: 'file-loader'
    }]
  };
}

function resolve() {
  return {
    modules: ["node_modules"],
  };
}

function replaceVersion(test, version, json) {
  const rule = {
    test,
    use: [
      {
        loader: 'string-replace-loader',
        options: {
          search: '@@mvelo_version',
          replace: version
        }
      }
    ]
  };
  if (json) {
    rule.use.push({loader: 'json-loader'});
  }
  return rule;
}

exports.plugins = plugins;
exports.module = {react};
exports.resolve = resolve;
exports.replaceVersion = replaceVersion;
