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
 * Verify that all locales we support exist in date-fns locales
 * @param {string[]} locales - list of locales (languages) resolved from webext locales dir
 * @throws
 */
function verifyLocalesExist(locales) {
  const localesDir = path.resolve(__dirname, '../node_modules/date-fns/locale');
  if (!fs.existsSync(localesDir)) {
    throw new Error('Error reading date-fns locales directory. Make sure date-fns lib is installed, run `npm i`');
  }
  locales.forEach(locale => {
    const localeDir = path.resolve(localesDir, locale);
    if (!fs.existsSync(localeDir)) {
      throw new Error(`Locale ${locale} is not found in date-fns/locale directory.`);
    }
  });
}

/**
 * Resolves languages supported by the webextension.
 * @returns {string[]} - list of locales from `locales` folder
 * @throws
 */
function getLocales() {
  // we use simple lang prefixes contrary to `date-fns` for some languages
  const lang_correction = {
    'en': 'en-US', // this is a tricky assumption
    'fa': 'fa-IR',
    'my': 'en-GB' // https://wikitravel.org/en/Myanmar#Talk
  };

  const localesDir = path.resolve(__dirname, '..', 'locales');
  const files = fs.readdirSync(localesDir);

  // Filter and map the files to get their paths
  const locales = files
  .filter(file => fs.statSync(path.join(localesDir, file)).isDirectory())
  .map(locale => lang_correction[locale] || locale);
  verifyLocalesExist(locales);

  console.log(`Locales resolved: ${locales.join(', ')}`);
  return locales;
}

exports.prod = prod;
exports.module = {css, css2str, scss, react, replaceVersion};
exports.resolve = resolve;
