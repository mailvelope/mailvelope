'use strict';

module.exports = function(grunt) {

  grunt.initConfig({

    glyphIconDataURL: grunt.file.read('dep/glyphicon.data'),

    clean: ['build/**/*', 'dist/**/*'],

    eslint: {
      options: {
        maxWarnings: 10
      },
      target: [
        'Gruntfile.js',
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
          configure: "jsdoc.conf.json"
        }
      }
    },

    concat: {
      content_script: {
        options: {
          footer: '//# sourceURL=cs-mailvelope.js'
        },
        files: [{
          src: [
            'src/mvelo.js',
            'src/content-scripts/main-cs.js',
            'src/content-scripts/extractFrame.js',
            'src/content-scripts/decryptFrame.js',
            'src/content-scripts/verifyFrame.js',
            'src/content-scripts/importFrame.js',
            'src/content-scripts/encryptFrame.js',
            'src/content-scripts/decryptContainer.js',
            'src/content-scripts/editorContainer.js',
            'src/content-scripts/optionsContainer.js',
            'src/content-scripts/keyGenContainer.js',
            'src/content-scripts/keyBackupContainer.js',
            'src/content-scripts/restoreBackupContainer.js',
            'src/content-scripts/syncHandler.js',
            'src/content-scripts/domAPI.js',
            'src/content-scripts/providerSpecific.js'
          ],
          dest: 'build/tmp/content-scripts/cs-mailvelope.js'
        }]
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
            cwd: 'bower_components/dompurify/src',
            src: 'purify.js',
            dest: 'build/tmp/dep/'
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

      browser: {
        files: [{
          expand: true,
          cwd: 'src/',
          src: ['chrome/**/*', 'firefox/**/*'],
          dest: 'build/'
        }]
      },

      dep_chrome: {
        files: [{
          expand: true,
          cwd: 'bower_components/requirejs/',
          src: 'require.js',
          dest: 'build/chrome/'
        },
        {
          expand: true,
          flatten: true,
          src: ['dep/chrome/openpgpjs/dist/openpgp.js', 'dep/chrome/openpgpjs/dist/openpgp.worker.js'],
          dest: 'build/chrome/dep/'
        },
        {
          expand: true,
          flatten: true,
          cwd: 'node_modules/',
          src: [
            'mailreader/src/mailreader-parser.js',
            'emailjs-mime-parser/src/*.js',
            'emailjs-addressparser/src/*.js',
            'emailjs-mime-codec/src/*.js',
            'emailjs-mime-builder/src/*.js',
            'emailjs-mime-types/src/*.js'
          ],
          dest: 'build/chrome/lib/'
        },
        {
          expand: true,
          flatten: true,
          src: 'node_modules/punycode/*.js',
          dest: 'build/chrome/lib/',
          rename: function(dest) {
            return dest + 'emailjs-punycode.js';
          }
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
          flatten: true,
          src: 'node_modules/mailreader/src/mailreader-parser.js',
          dest: 'build/firefox/node_modules/mailreader-parser'
        },
        {
          expand: true,
          flatten: true,
          src: 'node_modules/emailjs-mime-parser/src/*.js',
          dest: 'build/firefox/node_modules/emailjs-mime-parser'
        },
        {
          expand: true,
          flatten: true,
          src: 'node_modules/emailjs-mime-codec/src/*.js',
          dest: 'build/firefox/node_modules/emailjs-mime-codec'
        },
        {
          expand: true,
          flatten: true,
          src: 'node_modules/emailjs-addressparser/src/*.js',
          dest: 'build/firefox/node_modules/emailjs-addressparser'
        },
        {
          expand: true,
          flatten: true,
          src: 'node_modules/emailjs-mime-builder/src/*.js',
          dest: 'build/firefox/node_modules/emailjs-mime-builder'
        },
        {
          expand: true,
          flatten: true,
          src: 'node_modules/emailjs-mime-types/src/*.js',
          dest: 'build/firefox/node_modules/emailjs-mime-types'
        },
        {
          expand: true,
          flatten: true,
          src: 'node_modules/punycode/*.js',
          dest: 'build/firefox/node_modules/emailjs-punycode'
        }]
      },

      src2tmp: {
        files: [{
          expand: true,
          cwd: 'src/',
          src: [
            '**/*',
            '!app/**/components/*',
            '!content-scripts/*.js'
          ],
          dest: 'build/tmp'
        }]
      },

      tmp2chrome: {
        files: [{
          expand: true,
          cwd: 'build/tmp/',
          src: [
            'app/**/*',
            'client-API/*',
            'components/**/*',
            'content-scripts/*',
            'dep/**/*',
            'img/*',
            'lib/**/*',
            'res/**/*',
            'mvelo.*'
          ],
          dest: 'build/chrome'
        },
        {
          expand: true,
          cwd: 'build/tmp/',
          src: [
            'controller/*',
            'modules/**/*'
          ],
          dest: 'build/chrome/lib'
        }]
      },

      tmp2firefox: {
        files: [{
          expand: true,
          cwd: 'build/tmp/',
          src: [
            'app/**/*',
            'client-API/*',
            'components/**/*',
            'content-scripts/*',
            'dep/**/*',
            'img/*',
            'lib/**/*',
            'res/**/*',
            'mvelo.*'
          ],
          dest: 'build/firefox/data'
        },
        {
          expand: true,
          cwd: 'build/tmp/',
          src: [
            'controller/*',
            'modules/**/*'
          ],
          dest: 'build/firefox/lib'
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

    babel: {
      options: {
        sourceMap: false,
        presets: ['react']
      },
      dist: {
        files: [{
          expand: true,
          cwd: 'src/',
          src: 'app/**/components/*.js',
          dest: 'build/tmp'
        }]
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
      build_version: {
        src: 'build/tmp/res/defaults.json',
        dest: 'build/tmp/res/defaults.json',
        options: {
          patterns: [{
            match: /("version"\s:\s"[\d\.]+)/,
            replacement: '$1' + ' build: ' + (new Date()).toISOString().slice(0, 19)
          }]
        }
      },
      openpgp_ff: {
        src: 'dep/firefox/openpgpjs/dist/openpgp.min.js',
        dest: 'build/firefox/node_modules/openpgp/openpgp.js',
        options: {
          usePrefix: false,
          patterns: [{
            match: "*/",
            replacement: "*/\nvar window = require('./window');\n"
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
        files: ['package.json', 'bower.json', 'src/chrome/manifest.json', 'src/firefox/package.json', 'src/res/defaults.json']
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

  grunt.loadNpmTasks('grunt-babel');
  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-eslint');
  grunt.loadNpmTasks('grunt-jpm');
  grunt.loadNpmTasks('grunt-jsdoc');
  grunt.loadNpmTasks('grunt-mocha-phantomjs');
  grunt.loadNpmTasks('grunt-replace');

  //custom tasks
  grunt.registerTask('dist-cr', ['compress:chrome']);
  grunt.registerTask('dist-crx', function() {
    grunt.util.spawn({cmd: '.travis/crxmake.sh', args: ['build/chrome', '.travis/crx_signing.pem'], opts: {stdio: 'ignore'}});
  });
  grunt.registerTask('dist-ff', ['jpm:xpi', 'copy:xpi']);
  grunt.registerTask('dist-doc', ['jsdoc', 'compress:doc']);

  grunt.registerTask('copy2tmp', ['copy:browser', 'copy:src2tmp', 'copy:dep', 'copy:dep_chrome', 'copy:dep_firefox', 'replace:bootstrap', 'replace:openpgp_ff', 'concat', 'babel']);
  grunt.registerTask('final_assembly', ['copy:tmp2chrome', 'copy:tmp2firefox', 'copy:locale_firefox', 'copy:locale_chrome']);

  grunt.registerTask('default', ['clean', 'eslint', 'copy2tmp', 'final_assembly']);
  grunt.registerTask('nightly', ['clean', 'eslint', 'copy2tmp', 'replace:build_version', 'final_assembly']);

  grunt.registerTask('test', ['connect:test', 'mocha_phantomjs']);

};
