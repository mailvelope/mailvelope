/* eslint strict: 0 */

const jsonImporter  = require('node-sass-json-importer');

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

function css(loader = 'style-loader') {
  return [
    {
      test: /\.css$/,
      use: [{
        loader
      },
      {
        loader: 'css-loader',
        options: {
          url: false
        }
      }]
    },
  ];
}

function scss(loader = 'style-loader', css = false) {
  return [
    {
      test: css ? /\.(css|scss)$/ : /\.scss$/,
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
        loader: 'sass-loader', // compiles Sass to CSS
        // Apply the JSON importer via sass-loader's options.
        options: {
          importer: jsonImporter()
        }
      }]
    },
    {
      test: /\.svg$/,
      loader: 'file-loader'
    },
    {
      test: /\.woff2$/,
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
  ];
}

function react() {
  return [
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
    }
  ];
}

function replaceVersion(test, version) {
  return [
    {
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
    }
  ];
}

function resolve() {
  return {
    modules: ['node_modules'],
  };
}

exports.prod = prod;
exports.plugins = plugins;
exports.module = {css, scss, react, replaceVersion};
exports.resolve = resolve;
