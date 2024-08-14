/* eslint strict: 0 */

const jsonImporter  = require('node-sass-json-importer');
const path = require('path');
const fs = require('fs');
const webpack = require('webpack');

const prod = {
  mode: 'production',
  optimization: {
    minimize: false
  },
  performance: {
    hints: false
  },
  plugins: [
    new webpack.ContextReplacementPlugin(
      /date-fns[/\\]locale/,
      new RegExp(`(${getLocales().join('|')})\.mjs$`),
    ),
  ]
};

function css() {
  return [
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
  ];
}

function css2str() {
  return [
    {
      test: /\.css$/,
      use: [{
        loader: 'css-loader',
        options: {
          url: false,
          exportType: 'string'
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
        loader: 'sass-loader', // compiles Sass to CSS
        // Apply the JSON importer via sass-loader's options.
        options: {
          sassOptions: {
            importer: jsonImporter()
          }
        }
      }]
    },
    {
      test: /\.svg$/,
      type: 'asset/resource'
    },
    {
      test: /\.woff2$/,
      type: 'asset/resource',
      generator: {
        filename: 'res/fonts/[name].[ext]'
      }
    },
    {
      test: /\.png$/,
      type: 'asset/resource',
      generator: {
        filename: 'img/[name].[ext]'
      }
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
    // workaround for https://github.com/webpack/webpack/issues/13865
    alias: {
      'date-fns-locale': path.dirname(
        require.resolve('date-fns/package.json')
      ),
    },
    modules: ['node_modules'],
  };
}

/**
 * Resolves languages supported by the webextension.
 * @returns {string[]} - list of locales from `locales` folder
 */
function getLocales() {
  try {
    const localesDir = path.resolve(__dirname, '..', 'locales');
    // Read the directory
    const files = fs.readdirSync(localesDir);

    // Filter and map the files to get their paths
    const locales = files
    .filter(file => fs.statSync(path.join(localesDir, file)).isDirectory())
    .map(locale => locale);

    console.log(`Locales resolved: ${locales.join(', ')}`);
    return locales;
  } catch (err) {
    console.error('Error reading locales directory:', err);
    return [];
  }
}

exports.prod = prod;
exports.module = {css, css2str, scss, react, replaceVersion};
exports.resolve = resolve;
