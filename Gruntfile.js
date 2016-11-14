'use strict';

module.exports = function(grunt) {

  var pkg = grunt.file.readJSON('package.json');

  grunt.initConfig({

    glyphIconDataURL: grunt.file.read('dep/glyphicon.data'),

    clean: ['build/**/*', 'dist/**/*'],

    eslint: {
      options: {
        maxWarnings: 10,
        configFile: 'config/eslint.json'
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
            src: 'bower_components/jquery/dist/jquery.min.js',
            dest: 'build/tmp/dep/'
          },
          {
            expand: true,
            cwd: 'bower_components/bootstrap/dist/',
            src: [
              'css/bootstrap.css',
              'js/bootstrap.js',
              'fonts/*'
            ],
            dest: 'build/tmp/dep/bootstrap/'
          },
          {
            expand: true,
            cwd: 'bower_components/bootstrap-sortable/Scripts/',
            src: 'bootstrap-sortable.js',
            dest: 'build/tmp/dep/bootstrap-sortable/'
          },
          {
            expand: true,
            cwd: 'bower_components/bootstrap-sortable/Contents/',
            src: 'bootstrap-sortable.css',
            dest: 'build/tmp/dep/bootstrap-sortable/'
          },
          {
            expand: true,
            cwd: 'bower_components/qrcodejs/',
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
            cwd: 'node_modules/react/dist/',
            src: 'react.min.js',
            dest: 'build/tmp/dep/react/'
          },
          {
            expand: true,
            cwd: 'node_modules/react-dom/dist/',
            src: 'react-dom.min.js',
            dest: 'build/tmp/dep/react/'
          }
        ]
      },

      dep_chrome: {
        files: [{
          expand: true,
          flatten: true,
          src: ['dep/chrome/openpgpjs/dist/openpgp.js', 'dep/chrome/openpgpjs/dist/openpgp.worker.js'],
          dest: 'build/chrome/dep/'
        }]
      },

      dep_firefox: {
        files: [{
          expand: true,
          flatten: true,
          src: ['dep/firefox/openpgpjs/dist/openpgp.min.js', 'dep/firefox/openpgpjs/dist/openpgp.worker.min.js'],
          dest: 'build/firefox/data/'
        },
        {
          expand: true,
          cwd: 'bower_components/dompurify/src',
          src: 'purify.js',
          dest: 'build/firefox/data/dep/'
        }]
      },

      chrome: {
        files: [{
          expand: true,
          cwd: 'src/',
          src: [
            'chrome/manifest.json',
            'chrome/background.html'
          ],
          dest: 'build/'
        }]
      },

      firefox: {
        files: [{
          expand: true,
          cwd: 'src/',
          src: [
            'firefox/**/*',
            '!firefox/lib/*'
          ],
          dest: 'build/'
        }]
      },

      app2tmp: {
        files: [{
          expand: true,
          cwd: 'src/',
          src: [
            'app/**/*',
            '!app/**/*.js',
            'client-API/*',
            'components/**/*',
            'content-scripts/*.css',
            'img/*',
            'lib/*',
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
          dest: 'build/firefox/data'
        }]
      },

      locale_chrome: {
        expand: true,
        cwd: 'locales',
        src: '**/*',
        dest: 'build/chrome/_locales'
      },

      locale_firefox: {
        expand: true,
        cwd: 'locales',
        src: '**/*.json',
        dest: 'build/firefox/locale/',
        rename: function(dest, src) {
          return dest + src.match(/^[\w-]{2,5}/)[0].replace('_', '-') + '.properties';
        },
        options: {
          process: function(content) {
            var locale = JSON.parse(content);
            var result = '';
            for (var key in locale) {
              result += key + '= ' + locale[key].message.replace(/\$(\d)/g, '%$1s') + '\n';
            }
            return result;
          }
        }
      },

      xpi: {
        expand: true,
        flatten: true,
        src: 'dist/*.xpi',
        dest: 'dist/',
        rename: function(dest) {
          return dest + 'mailvelope.firefox.xpi';
        }
      }
    },

    watch: {
      scripts: {
        files: ['Gruntfile.js', 'src/**/*.js'],
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
        src: 'build/firefox/package.json',
        dest: 'build/firefox/package.json',
        options: {
          patterns: [{
            match: 'mvelo_version',
            replacement: pkg.version
          }]
        }
      },
      openpgp_firefox: {
        src: 'dep/firefox/openpgpjs/dist/openpgp.min.js',
        dest: 'dep/firefox/openpgpjs/dist/openpgp.js',
        options: {
          usePrefix: false,
          patterns: [{
            match: "*/",
            replacement: "*/\nvar window = require('window');\n"
          }]
        }
      }
    },

    jpm: {
      options: {
        src: "./build/firefox",
        xpi: "./dist/"
      }
    },

    bump: {
      options: {
        commit: true,
        commitFiles: ['-a'],
        createTag: false,
        push: false,
        files: ['package.json', 'bower.json']
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
  grunt.loadNpmTasks('grunt-jpm');
  grunt.loadNpmTasks('grunt-jsdoc');
  grunt.loadNpmTasks('grunt-mocha-phantomjs');
  grunt.loadNpmTasks('grunt-replace');

  // distribution
  grunt.registerTask('dist-cr', ['compress:chrome']);
  grunt.registerTask('dist-crx', function() {
    grunt.util.spawn({cmd: '.travis/crxmake.sh', args: ['build/chrome', '.travis/crx_signing.pem'], opts: {stdio: 'ignore'}});
  });
  grunt.registerTask('dist-ff', ['jpm:xpi', 'copy:xpi']);
  grunt.registerTask('dist-doc', ['jsdoc', 'compress:doc']);

  // build steps
  grunt.registerTask('chrome_modules', ['copy:chrome', 'replace:version_chrome', 'copy:dep_chrome']);
  grunt.registerTask('firefox_modules', ['copy:firefox', 'replace:version_firefox', 'replace:openpgp_firefox', 'copy:dep_firefox']);
  grunt.registerTask('copy2tmp', ['copy:app2tmp', 'copy:dep', 'replace:bootstrap']);
  grunt.registerTask('final_steps', ['copy:tmp2chrome', 'copy:tmp2firefox', 'copy:locale_firefox', 'copy:locale_chrome']);

  // development builds
  grunt.registerTask('default', ['clean', 'eslint', 'chrome_modules', 'firefox_modules', 'webpack:chrome.dev', 'webpack:firefox.dev', 'webpack:cs.dev', 'copy2tmp', 'webpack:app.dev', 'final_steps']);
  grunt.registerTask('chrome', ['clean', 'eslint', 'chrome_modules', 'webpack:chrome.dev', 'webpack:cs.dev', 'copy2tmp', 'webpack:app.dev', 'copy:tmp2chrome', 'copy:locale_chrome']);
  grunt.registerTask('firefox', ['clean', 'eslint', 'firefox_modules', 'webpack:firefox.dev', 'webpack:cs.dev', 'copy2tmp', 'webpack:app.dev', 'copy:tmp2firefox', 'copy:locale_firefox']);

  // production build
  grunt.registerTask('prod', ['clean', 'eslint', 'chrome_modules', 'firefox_modules', 'webpack:chrome.prod', 'webpack:firefox.prod', 'webpack:cs.prod', 'copy2tmp', 'webpack:app.prod', 'final_steps']);

  grunt.registerTask('test', ['webpack:test', 'connect:test', 'mocha_phantomjs']);

  grunt.registerTask('webpack', function() {
    var done = this.async();
    grunt.util.spawn({cmd: process.argv[0], args: ['./node_modules/webpack/bin/webpack.js', '--config=config/webpack.' + this.args[0] + '.js'], opts: {stdio: 'inherit'}}, function(error, result) {
      done(result.code !== 1);
    });
  });

};
