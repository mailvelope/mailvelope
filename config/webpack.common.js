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

function react() {
  return {
    rules: [{
      test: /\.js$/,
      exclude: /node_modules/,
      loader: 'babel-loader',
      options: {
        babelrc: false,
        cacheDirectory: true,
        presets: ['@babel/react'],
        plugins: ['@babel/plugin-syntax-object-rest-spread']
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
exports.module = {react};
exports.resolve = resolve;
exports.replaceVersion = replaceVersion;
