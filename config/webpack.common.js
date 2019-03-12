/* eslint strict: 0 */
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');

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
    },
    new MiniCssExtractPlugin({
      filename: '../mvelo.css'
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
      test: /\.scss$/,
      use: [
        ({resource}) => ({
          loader: path.basename(resource, '.scss') === 'mvelo' ? MiniCssExtractPlugin.loader : 'style-loader', // create main css or inject CSS to page
        }), {
          loader: 'css-loader',
        }, {
          loader: 'postcss-loader',
          options: {
            ident: 'postcss',
            plugins: () => [require('autoprefixer')]
          }
        }, {
          loader: 'sass-loader'
        }
      ]
    },
    {
      test: /\.(woff2?|ttf|svg|eot)(\?v=\d+\.\d+\.\d+)?$/,
      loader: 'file-loader'
    }]
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
exports.module = {react};
exports.resolve = resolve;
exports.replaceVersion = replaceVersion;
