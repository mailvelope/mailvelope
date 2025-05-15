/* eslint strict: 0 */

import jsonImporter from '@blakedarlin/sass-json-importer';

const prod = {
  mode: 'production',
  optimization: {
    minimize: false
  },
  performance: {
    hints: false
  }
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
            importers: [jsonImporter()],
            silenceDeprecations: ['import', 'color-functions', 'slash-div', 'mixed-decls', 'global-builtin', 'abs-percent']
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
    modules: ['node_modules'],
  };
}

export {prod, resolve};
export const module = {css, css2str, scss, react, replaceVersion};
