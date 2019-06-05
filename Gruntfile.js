/* eslint strict: 0 */
'use strict';

module.exports = function(grunt) {
  const pkg = grunt.file.readJSON('package.json');

  grunt.initConfig({

    clean: ['build/**/*', 'dist/**/*'],

    eslint: {
      options: {
        maxWarnings: 1,
        configFile: 'config/eslint.json',
        cache: true,
        fix: grunt.option('fix'),
        reportUnusedDisableDirectives: true
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
            src: 'node_modules/jquery/dist/jquery.min.js',
            dest: 'build/tmp/dep/'
          },
          {
            expand: true,
            flatten: true,
            src: 'node_modules/popper.js/dist/umd/popper.min.js',
            dest: 'build/tmp/dep/popper/'
          },
          {
            expand: true,
            cwd: 'node_modules/bootstrap/dist/',
            src: [
              'js/bootstrap.js',
            ],
            dest: 'build/tmp/dep/bootstrap/'
          },
          {
            expand: true,
            cwd: 'node_modules/qrcodejs/',
            src: 'qrcode.js',
            dest: 'build/tmp/dep/qrcodejs/'
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
          },
          {
            expand: true,
            flatten: true,
            src: ['node_modules/openpgp/dist/openpgp.js', 'node_modules/openpgp/dist/openpgp.worker.js'],
            dest: 'build/tmp/dep/'
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
            'components/recovery-sheet/**/*',
            'content-scripts/*.css',
            'img/{*,Mailvelope/*,security/*}',
            'lib/{constants,EventHandler,jquery.ext,l10n,util,svg-file-parser}.js',
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
        files: ['Gruntfile.js', 'src/**/*'],
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
          src: ['chrome/**/*', 'chrome/!**/.*']
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
        command: 'node --max_old_space_size=4096 node_modules/karma/bin/karma start --single-run --browsers ChromeHeadlessNoSandbox test/karma.conf.js'
      },
      karma_test_dev: {
        command: 'node --max_old_space_size=4096 node_modules/karma/bin/karma start --single-run --browsers ChromeHeadlessNoSandbox test/karma.conf.js --dev'
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

  // distribution
  grunt.registerTask('dist-cr', ['compress:chrome']);
  grunt.registerTask('dist-crx', () => {
    grunt.util.spawn({cmd: '.travis/crxmake.sh', args: ['build/chrome', '.travis/crx_signing.pem'], opts: {stdio: 'ignore'}});
  });
  grunt.registerTask('dist-ff', ['shell:webex_build', 'shell:move_firefox_dist']);
  grunt.registerTask('dist-doc', ['jsdoc', 'compress:doc']);

  // build steps
  grunt.registerTask('browser', ['copy:chrome', 'replace:version_chrome', 'copy:firefox', 'replace:version_firefox']);
  grunt.registerTask('copy2tmp', ['copy:common', 'copy:locale', 'copy:dep']);
  grunt.registerTask('tmp2browser', ['copy:tmp2chrome', 'copy:tmp2firefox']);

  // development build
  grunt.registerTask('default', ['clean', 'eslint', 'browser', 'copy2tmp', 'copy:dep_dev', 'webpack:dev', 'tmp2browser']);

  // production build
  grunt.registerTask('prod', ['clean', 'eslint', 'browser', 'copy2tmp', 'copy:dep_prod', 'webpack:prod', 'tmp2browser']);

  grunt.registerTask('test', ['shell:karma_test']);

  grunt.registerTask('test-dev', ['shell:karma_test_dev']);

  grunt.registerTask('webpack', function() {
    const done = this.async();
    // , '--display-modules'
    grunt.util.spawn({cmd: process.argv[0], args: ['./node_modules/webpack/bin/webpack.js', `--config=config/webpack.${this.args[0]}.js`], opts: {stdio: 'inherit'}}, (error, result) => {
      done(result.code !== 1);
    });
  });
};
