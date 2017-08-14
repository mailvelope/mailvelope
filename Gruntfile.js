/* eslint strict: 0 */
'use strict';

module.exports = function(grunt) {
  const pkg = grunt.file.readJSON('package.json');

  grunt.initConfig({

    glyphIconDataURL: grunt.file.read('dep/glyphicon.data'),

    clean: ['build/**/*', 'dist/**/*'],

    eslint: {
      options: {
        maxWarnings: 10,
        configFile: 'config/eslint.json',
        cache: true
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
        src: ['src/client-API/*.js', "doc/client-api/Readme.md"],
        options: {
          destination: 'build/doc',
          template: "node_modules/ink-docstrap/template",
          tutorials: "doc/client-api",
          configure: "config/jsdoc.json"
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
            cwd: 'node_modules/bootstrap/dist/',
            src: [
              'css/bootstrap.css',
              'js/bootstrap.js',
              'fonts/*'
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
            src: ['dep/chrome/openpgpjs/dist/openpgp.js', 'dep/chrome/openpgpjs/dist/openpgp.worker.js'],
            dest: 'build/tmp/dep/'
          }
        ]
      },

      dep_dev: {
        files: [{
          src: 'node_modules/react/dist/react.js',
          dest: 'build/tmp/dep/react/react.js'
        },
        {
          src: 'node_modules/react-dom/dist/react-dom.js',
          dest: 'build/tmp/dep/react/react-dom.js'
        }]
      },

      dep_prod: {
        files: [{
          src: 'node_modules/react/dist/react.min.js',
          dest: 'build/tmp/dep/react/react.js'
        },
        {
          src: 'node_modules/react-dom/dist/react-dom.min.js',
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
            'client-API/*',
            'components/**/*',
            '!components/editor/**/*.js',
            '!components/util/**/*',
            'content-scripts/*.css',
            'content-scripts/addToWatchlist.js',
            'img/*',
            'lib/jquery.ext.js',
            'res/**/*',
            '!res/*.json',
            'mvelo.*'
          ],
          dest: 'build/tmp'
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
      bootstrap: {
        src: 'build/tmp/dep/bootstrap/css/bootstrap.css',
        dest: 'build/tmp/dep/bootstrap/css/bootstrap.css',
        options: {
          usePrefix: false,
          patterns: [{
            match: /@font-face[\.\S\s]+\.glyphicon\ {/g,
            replacement: "@font-face {\n  font-family:'Glyphicons Halflings';src:url('<%= glyphIconDataURL %>') format('woff')\n}\n.glyphicon {"
          },
          {
            match: '# sourceMappingURL=bootstrap.css.map',
            replacement: ''
          }]
        }
      },
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

    bump: {
      options: {
        commit: true,
        commitFiles: ['-a'],
        createTag: false,
        push: false,
        files: ['package.json']
      }
    },

    connect: {
      dev: {
        options: {
          port: 8580,
          base: '.',
          keepalive: true
        }
      },
      test: {
        options: {
          port: 8581,
          base: '.'
        }
      }
    },

    mocha_phantomjs: {
      all: {
        options: {
          urls: ['http://localhost:<%= connect.test.options.port %>/test/index.html']
        }
      }
    }

  });

  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-jsdoc');
  grunt.loadNpmTasks('grunt-mocha-phantomjs');
  grunt.loadNpmTasks('grunt-replace');

  // distribution
  grunt.registerTask('dist-cr', ['compress:chrome']);
  grunt.registerTask('dist-crx', () => {
    grunt.util.spawn({cmd: '.travis/crxmake.sh', args: ['build/chrome', '.travis/crx_signing.pem'], opts: {stdio: 'ignore'}});
  });
  grunt.registerTask('dist-ff', ['jpm:xpi', 'copy:xpi']);
  grunt.registerTask('dist-doc', ['jsdoc', 'compress:doc']);

  // build steps
  grunt.registerTask('browser', ['copy:chrome', 'replace:version_chrome', 'copy:firefox', 'replace:version_firefox']);
  grunt.registerTask('copy2tmp', ['copy:common', 'copy:locale', 'copy:dep', 'replace:bootstrap']);
  grunt.registerTask('tmp2browser', ['copy:tmp2chrome', 'copy:tmp2firefox']);

  // development build
  grunt.registerTask('default', ['clean', 'eslint', 'browser', 'copy2tmp', 'copy:dep_dev', 'webpack:dev', 'tmp2browser']);

  // production build
  grunt.registerTask('prod', ['clean', 'eslint', 'browser', 'copy2tmp', 'copy:dep_prod', 'webpack:prod', 'tmp2browser']);

  grunt.registerTask('test', ['webpack:test', 'connect:test', 'mocha_phantomjs']);

  grunt.registerTask('webpack', function() {
    const done = this.async();
    // , '--display-modules'
    grunt.util.spawn({cmd: process.argv[0], args: ['./node_modules/webpack/bin/webpack.js', `--config=config/webpack.${this.args[0]}.js`], opts: {stdio: 'inherit'}}, (error, result) => {
      done(result.code !== 1);
    });
  });
};
