/* eslint strict: 0 */

const prod = {
  mode: 'production',
  optimization: {
    minimize: false
  },
  plugins: plugins(),
  performance: {
    hints: false
  }
};

function plugins() {
  return [
    function() {
      this.hooks.done.tap('DoneHook', stats => {
        if (stats.compilation.errors && stats.compilation.errors.length && process.argv.indexOf('--watch') == -1) {
          process.exitCode = 1;
        }
      });
    }
  ];
}

function scss(loader = 'style-loader') {
  return {
    rules: [
      {
        test: /\.scss$/,
        use: [{
          loader,
        }, {
          loader: 'css-loader',
        }, {
          loader: 'postcss-loader',
          options: {
            plugins: () =>
              [
                require('autoprefixer')
              ]
          }
        }, {
          loader: 'sass-loader' // compiles Sass to CSS
        }]
      },
      {
        test: /\.(woff|woff2)(\?v=\d+\.\d+\.\d+)?$/,
        use: [{
          loader: 'file-loader',
          options: {
            name: '[name].[ext]',
            outputPath: 'res/fonts/'
          }
        }]
      },
      {
        test: /\.png$/,
        use: [{
          loader: 'file-loader',
          options: {
            name: '[name].[ext]',
            outputPath: 'img/'
          }
        }]
      }
    ]
  };
}

function react() {
  const {rules: scssRules} = scss();
  return {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader',
        options: {
          babelrc: false,
          cacheDirectory: true,
          presets: ['@babel/react'],
          plugins: []
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
      ...scssRules
    ]
  };
}

function resolve() {
  return {
    modules: ['node_modules'],
  };
}

function replaceVersion(test, version) {
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
  return rule;
}

exports.prod = prod;
exports.plugins = plugins;
exports.module = {scss, react};
exports.resolve = resolve;
exports.replaceVersion = replaceVersion;
