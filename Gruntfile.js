/* eslint strict: 0 */
'use strict';

module.exports = function(grunt) {
  const pkg = grunt.file.readJSON('package.json');
  grunt.initConfig({

    clean: ['build/**/*', 'dist/**/*'],

    eslint: {
      options: {
        maxWarnings: 1,
        overrideConfigFile: 'config/eslint.json',
        cache: true,
        fix: grunt.option('fix'),
        reportUnusedDisableDirectives: 'warn'
      },
      target: [
        '*.js',
        'config/*.js',
        'src/**/*.js',
        '!src/modules/closure-library/**/*.js',
        'test/**/*.js'
      ]
    },

    jsdoc: {
      dist: {
        src: ['src/client-API/*.js', 'doc/client-api/Readme.md'],
        options: {
          destination: 'build/doc',
          template: 'node_modules/ink-docstrap/template',
          tutorials: 'doc/client-api',
          configure: 'config/jsdoc.json'
        }
      }
    },

    copy: {

      dep: {
        files: [
          {
            expand: true,
            flatten: true,
            src: 'node_modules/jquery/dist/jquery.slim.min.js',
            dest: 'build/tmp/dep/'
          },
          {
            expand: true,
            cwd: 'node_modules/bootstrap/dist/',
            src: [
              'js/bootstrap.bundle.min.js',
            ],
            dest: 'build/tmp/dep/bootstrap/'
          },
          {
            expand: true,
            cwd: 'node_modules/angular/',
            src: ['angular.min.js', 'angular-csp.css'],
            dest: 'build/tmp/dep/angular/'
          },
          {
            expand: true,
            cwd: 'node_modules/ng-tags-input/build/',
            src: ['ng-tags-input.min.js', 'ng-tags-input.min.css', 'ng-tags-input.bootstrap.min.css'],
            dest: 'build/tmp/dep/ng-tags-input/'
          }
        ]
      },

      dep_dev: {
        files: [{
          src: 'node_modules/react/umd/react.development.js',
          dest: 'build/tmp/dep/react/react.js'
        },
        {
          src: 'node_modules/react-dom/umd/react-dom.development.js',
          dest: 'build/tmp/dep/react/react-dom.js'
        }]
      },

      dep_prod: {
        files: [{
          src: 'node_modules/react/umd/react.production.min.js',
          dest: 'build/tmp/dep/react/react.js'
        },
        {
          src: 'node_modules/react-dom/umd/react-dom.production.min.js',
          dest: 'build/tmp/dep/react/react-dom.js'
        }]
      },

      chrome: {
        files: [{
          expand: true,
          cwd: 'src/',
          src: [
            'chrome/manifest.json'
          ],
          dest: 'build/'
        }]
      },

      firefox: {
        files: [{
          expand: true,
          cwd: 'src/',
          src: [
            'firefox/manifest.json'
          ],
          dest: 'build/'
        }]
      },

      common: {
        files: [{
          expand: true,
          cwd: 'src/',
          src: [
            'app/app.html',
            'components/**/*.html',
            'components/recovery-sheet/assets/**/*',
            'img/{*,Mailvelope/*,security/*}',
            'lib/{constants,EventHandler,l10n,util,svg-file-parser}.js',
          ],
          dest: 'build/tmp'
        }, {
          expand: true,
          flatten: true,
          cwd: 'src/',
          src: [
            'res/fonts/**/*.{txt,md}',
          ],
          dest: 'build/tmp/res/fonts',
        }]
      },

      tmp2chrome: {
        files: [{
          expand: true,
          cwd: 'build/tmp/',
          src: '**/*',
          dest: 'build/chrome'
        }]
      },

      tmp2firefox: {
        files: [{
          expand: true,
          cwd: 'build/tmp/',
          src: '**/*',
          dest: 'build/firefox'
        }]
      },

      locale: {
        expand: true,
        cwd: 'locales',
        src: '**/*',
        dest: 'build/tmp/_locales'
      }
    },

    watch: {
      scripts: {
        files: ['Gruntfile.js', 'src/**/*', 'locales/**/*'],
        tasks: ['default'],
        options: {
          spawn: false
        }
      }
    },

    compress: {
      chrome: {
        options: {
          mode: 'zip',
          archive: 'dist/mailvelope.chrome.zip',
          pretty: true
        },
        files: [{
          expand: true,
          cwd: 'build/',
          src: ['chrome/**/*', '!chrome/**/.*']
        }]
      },
      edge: {
        options: {
          mode: 'zip',
          archive: 'dist/mailvelope.edge.zip',
          pretty: true
        },
        files: [{
          expand: true,
          cwd: 'build/',
          src: ['chrome/**/*', '!chrome/**/.*', '!chrome/_locales/**/*', 'chrome/_locales/en/*']
        }]
      },
      src: {
        options: {
          mode: 'zip',
          archive: `dist/mailvelope.${pkg.version}.src.zip`,
          pretty: true
        },
        files: [{
          expand: true,
          src: ['**/*', '!.*', '{src,test}/**/.eslintrc.json', '!mailvelope.*', '!build/**', '!dist/**', '!node_modules/**']
        }]
      },
      doc: {
        options: {
          mode: 'zip',
          archive: 'dist/mailvelope.client-api-documentation.zip',
          pretty: true
        },
        files: [{
          expand: true,
          cwd: 'build/doc/',
          src: ['**/*']
        }]
      }
    },

    replace: {
      version_chrome: {
        src: 'build/chrome/manifest.json',
        dest: 'build/chrome/manifest.json',
        options: {
          patterns: [{
            match: 'mvelo_version',
            replacement: pkg.version
          }]
        }
      },
      version_firefox: {
        src: 'build/firefox/manifest.json',
        dest: 'build/firefox/manifest.json',
        options: {
          patterns: [{
            match: 'mvelo_version',
            replacement: pkg.version
          }]
        }
      }
    },

    shell: {
      move_firefox_dist: {
        command: 'mv dist/mailvelope-*.zip dist/mailvelope.firefox.zip'
      },
      webex_build: {
        command: 'web-ext build --source-dir=build/firefox --artifacts-dir=dist'
      },
      karma_test: {
        command: 'node --max_old_space_size=4096 node_modules/karma/bin/karma start --single-run --browsers ChromeHeadless test/karma.conf.js'
      },
      karma_test_dev: {
        command: 'node --max_old_space_size=4608 node_modules/karma/bin/karma start --single-run --browsers ChromeHeadless test/karma.conf.js --dev'
      },
      karma_test_debug: {
        command: 'node --max_old_space_size=4608 node_modules/karma/bin/karma start --browsers Chrome test/karma.conf.js --dev'
      }
    },

    bump: {
      options: {
        commit: true,
        commitFiles: ['-a'],
        createTag: false,
        push: false,
        files: ['package.json']
      }
    },

    webpack: {
      options: {
        progress: false
      },
      dev: require('./config/webpack.dev.js'),
      prod: require('./config/webpack.prod.js')
    }

  });

  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-jsdoc');
  grunt.loadNpmTasks('grunt-replace');
  grunt.loadNpmTasks('grunt-shell');
  grunt.loadNpmTasks('grunt-webpack');

  // distribution
  grunt.registerTask('dist-cr', ['compress:chrome']);
  grunt.registerTask('dist-edge', ['compress:edge']);
  grunt.registerTask('dist-src', ['compress:src']);
  grunt.registerTask('dist-crx', () => {
    grunt.util.spawn({cmd: '.travis/crxmake.sh', args: ['build/chrome', '.travis/crx_signing.pem'], opts: {stdio: 'ignore'}});
  });
  grunt.registerTask('dist-ff', ['shell:webex_build', 'shell:move_firefox_dist']);
  grunt.registerTask('dist-doc', ['jsdoc', 'compress:doc']);

  // build steps
  grunt.registerTask('browser', ['copy:chrome', 'replace:version_chrome', 'copy:firefox', 'replace:version_firefox']);
  grunt.registerTask('copy2tmp', ['copy:common', 'copy:locale', 'copy:dep']);
  grunt.registerTask('tmp2browser', ['copy:tmp2chrome', 'copy:tmp2firefox']);

  // source code generation
  grunt.registerTask('date-fns-locales', 'Generate date-fns locales JS file to be later used.', () => {
    try {
      const locales = getLocales();
      const template = `export default {${locales.map(locale => `'${locale}': require('date-fns/locale/${locale}').${locale.replace('-', '')}`).join(', ')}};\n`;
      const dir = path.resolve('tmp/gen');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }
      fs.writeFileSync(path.resolve(dir, 'date-fns-locales.js'), template);
    } catch (e) {
      grunt.fail.warn(e.message);
    }
  });

  // development build
  grunt.registerTask('default', ['clean', 'eslint', 'browser', 'copy2tmp', 'date-fns-locales', 'copy:dep_dev', 'webpack:dev', 'tmp2browser']);

  // production build
  grunt.registerTask('prod', ['clean', 'eslint', 'browser', 'copy2tmp', 'date-fns-locales', 'copy:dep_prod', 'webpack:prod', 'tmp2browser']);

  grunt.registerTask('test', ['shell:karma_test']);

  grunt.registerTask('test-dev', ['shell:karma_test_dev']);

  grunt.registerTask('test-debug', ['shell:karma_test_debug']);
};

const path = require('path');
const fs = require('fs');
/**
 * Verify that all locales we support exist in date-fns locales
 * @param {string[]} locales - list of locales (languages) resolved from webext locales dir
 * @throws
 */
function verifyLocalesExist(locales) {
  const localesDir = path.resolve(__dirname, 'node_modules/date-fns/locale');
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
// eslint-disable-next-line no-unused-vars
function getLocales() {
  // we use simple lang prefixes contrary to `date-fns` for some languages
  const lang_correction = {
    'en': 'en-US', // this is a tricky assumption
    'fa': 'fa-IR',
    'my': 'en-GB' // https://wikitravel.org/en/Myanmar#Talk
  };

  const localesDir = path.resolve(__dirname, 'locales');
  const files = fs.readdirSync(localesDir);

  // Filter and map the files to get their paths
  const locales = files
  .filter(file => fs.statSync(path.join(localesDir, file)).isDirectory())
  .map(locale => lang_correction[locale] || locale);
  verifyLocalesExist(locales);

  console.log(`Locales resolved: ${locales.join(', ')}`);
  return locales;
}
