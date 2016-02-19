'use strict';

module.exports = function(grunt) {

  grunt.initConfig({

    glyphIconDataURL: grunt.file.read('dep/glyphicon.data'),

    clean: ['build/**/*', 'dist/**/*'],

    clean_all: ['build/', 'tmp/', 'dist/**/*'],

    jshint: {
      options: {
        jshintrc: true
      },
      all: {
        src: [
          'Gruntfile.js',
          'common/ui/**/*.js',
          'common/lib/*.js',
          'common/lib/controller/*.js',
          'common/client-API/*.js',
          'chrome/background.js',
          'chrome/lib/*.js',
          'firefox/**/*.js'
        ]
      }
    },

    jscs: {
      options: {
        config: ".jscs.json",
        maxErrors: 5
      },
      files: {
        src: [
          'Gruntfile.js',
          'common/ui/**/*.js',
          'common/lib/*.js',
          'common/lib/controller/*.js',
          'common/client-API/*.js',
          'chrome/background.js',
          'chrome/lib/*.js',
          'firefox/**/*.js'
        ]
      }
    },

    jsdoc : {
      dist : {
        src: ['common/client-API/*.js', "doc/client-api/Readme.md"],
        options: {
          destination: 'build/doc',
          template: "node_modules/grunt-jsdoc/node_modules/ink-docstrap/template",
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
            'common/ui/mvelo.js',
            'common/ui/inline/main-cs.js',
            'common/ui/inline/extractFrame.js',
            'common/ui/inline/decryptFrame.js',
            'common/ui/inline/verifyFrame.js',
            'common/ui/inline/importFrame.js',
            'common/ui/inline/encryptFrame.js',
            'common/ui/inline/decryptContainer.js',
            'common/ui/inline/editorContainer.js',
            'common/ui/inline/optionsContainer.js',
            'common/ui/inline/keyGenContainer.js',
            'common/ui/inline/keyBackupContainer.js',
            'common/ui/inline/restoreBackupContainer.js',
            'common/ui/inline/syncHandler.js',
            'common/ui/inline/domAPI.js'
          ],
          dest: 'build/common/ui/inline/cs-mailvelope.js'
        }]
      }
    },

    copy: {
      jquery: {
        src: 'bower_components/jquery/index.js',
        dest: 'build/common/dep/jquery.min.js'
      },
      vendor: {
        files: [
          {
            expand: true,
            cwd: 'bower_components/bootstrap/dist/',
            src: [
              'css/bootstrap.css',
              'js/bootstrap.js',
              'fonts/*'
            ],
            dest: 'build/common/dep/bootstrap/'
          },
          {
            expand: true,
            cwd: 'bower_components/bootstrap-sortable/Scripts/',
            src: 'bootstrap-sortable.js',
            dest: 'build/common/dep/bootstrap-sortable/'
          },
          {
            expand: true,
            cwd: 'bower_components/bootstrap-sortable/Contents/',
            src: 'bootstrap-sortable.css',
            dest: 'build/common/dep/bootstrap-sortable/'
          },
          {
            expand: true,
            cwd: 'bower_components/dompurify/src',
            src: 'purify.js',
            dest: 'build/common/dep/'
          },
          {
            expand: true,
            cwd: 'bower_components/requirejs/',
            src: 'require.js',
            dest: 'build/chrome/'
          },
          {
            expand: true,
            cwd: 'bower_components/qrcodejs/',
            src: 'qrcode.js',
            dest: 'build/common/dep/qrcodejs/'
          }
        ]
      },
      common: {
        files: [{
          src: [
            'common/**/*',
            '!common/ui/inline/*.js',
            'common/ui/mvelo.js',
            '!common/dep/wysihtml5/**/*'
          ],
          dest: 'build/'
        }]
      },
      plugins: {
        files: [{
          src: ['chrome/**/*', 'firefox/**/*'],
          dest: 'build/'
        }]
      },
      common_browser: {
        files: [{
          expand: true,
          src: ['common/**/*', '!common/lib/**/*'],
          cwd: 'build/',
          dest: 'build/chrome/'
        },
        {
          expand: true,
          src: '**/*',
          cwd: 'build/common/lib/',
          dest: 'build/chrome/lib/common/'
        },
        {
          expand: true,
          src: ['common/**/*', '!common/lib/**/*'],
          cwd: 'build/',
          dest: 'build/firefox/data/'
        },
        {
          expand: true,
          src: '**/*',
          cwd: 'build/common/lib/',
          dest: 'build/firefox/lib/common/'
        },
        {
          expand: true,
          src: '**/*',
          cwd: 'locales',
          dest: 'build/chrome/_locales'
        }]
      },
      locale_firefox: {
        expand: true,
        src: '**/*.json',
        cwd: 'locales',
        dest: 'build/firefox/locale/',
        rename: function(dest, src) {
          return dest + src.match(/^[\w-]{2,5}/)[0].replace('_', '-') + '.properties';
        },
        options: {
          process: function(content, srcpath) {
            var locale = JSON.parse(content);
            var result = '';
            for (var key in locale) {
              result += key + '= ' + locale[key].message.replace(/\$(\d)/g, '%$1s') + '\n';
            }
            return result;
          }
        }
      },
      dep: {
        files: [{
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
            'mailreader/node_modules/emailjs-mime-parser/src/*.js',
            'mailreader/node_modules/emailjs-mime-parser/node_modules/emailjs-addressparser/src/*.js',
            'emailjs-mime-codec/src/*.js',
            'emailjs-mime-builder/src/*.js',
            'emailjs-mime-builder/node_modules/emailjs-mime-types/src/*.js'
          ],
          dest: 'build/chrome/lib/'
        },
        {
          expand: true,
          flatten: true,
          src: 'node_modules/emailjs-mime-builder/node_modules/punycode/*.js',
          dest: 'build/chrome/lib/',
          rename: function(dest) {
            return dest + 'emailjs-punycode.js';
          }
        },
        {
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
          src: 'node_modules/mailreader/node_modules/emailjs-mime-parser/src/*.js',
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
          src: 'node_modules/mailreader/node_modules/emailjs-mime-parser/node_modules/emailjs-addressparser/src/*.js',
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
          src: 'node_modules/emailjs-mime-builder/node_modules/emailjs-mime-types/src/*.js',
          dest: 'build/firefox/node_modules/emailjs-mime-types'
        },
        {
          expand: true,
          flatten: true,
          src: 'node_modules/emailjs-mime-builder/node_modules/punycode/*.js',
          dest: 'build/firefox/node_modules/emailjs-punycode'
        }]
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
        files: ['Gruntfile.js', '{common,dep,chrome,firefox}/**/*.js'],
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
          src: ['chrome/**/*', 'chrome/!**/.*'],
          cwd: 'build/'
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
          src: ['**/*'],
          cwd: 'build/doc/'
        }]
      }
    },

    replace: {
      bootstrap: {
        src: ['bower_components/bootstrap/dist/css/bootstrap.css'],
        dest: ['build/common/dep/bootstrap/css/bootstrap.css'],
        replacements: [{
          from: /@font-face[\.\S\s]+\.glyphicon\ {/g,
          to: "@font-face {\n  font-family:'Glyphicons Halflings';src:url('<%= glyphIconDataURL %>') format('woff')\n}\n.glyphicon {"
        },
        {
          from: '# sourceMappingURL=bootstrap.css.map',
          to: ''
        }]
      },
      build_version: {
        src: ['build/common/res/defaults.json'],
        dest: ['build/common/res/defaults.json'],
        replacements: [{
          from: /("version"\s:\s"[\d\.]+)/,
          to: '$1' + ' build: ' + (new Date()).toISOString().slice(0, 19)
        }]
      },
      openpgp_ff: {
        src: ['dep/firefox/openpgpjs/dist/openpgp.min.js'],
        dest: ['build/firefox/node_modules/openpgp/openpgp.js'],
        replacements: [{
          from: "*/",
          to: "*/\nvar window = require('./window');\n"
        }]
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
        files: ['package.json', 'bower.json', 'chrome/manifest.json', 'firefox/package.json', 'common/res/defaults.json']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-text-replace');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-bump');
  grunt.loadNpmTasks("grunt-jscs");
  grunt.loadNpmTasks('grunt-jsdoc');
  grunt.loadNpmTasks('grunt-jpm');

  //custom tasks
  grunt.registerTask('dist-cr', ['compress:chrome']);
  grunt.registerTask('dist-crx', function() {
    grunt.util.spawn({cmd: '.travis/crxmake.sh', args: ['build/chrome', '.travis/crx_signing.pem'], opts: {stdio: 'ignore'}});
  });
  grunt.registerTask('dist-ff', ['jpm:xpi', 'copy:xpi']);
  grunt.registerTask('dist-doc', ['jsdoc', 'compress:doc']);

  grunt.registerTask('copy_common', ['copy:vendor', 'copy:common', 'replace:bootstrap', 'replace:openpgp_ff']);
  grunt.registerTask('final_assembly', ['copy:plugins', 'copy:common_browser', 'copy:locale_firefox', 'copy:dep']);

  grunt.registerTask('default', ['clean', 'jshint', 'jscs', 'copy:jquery', 'concat', 'copy_common', 'final_assembly']);
  grunt.registerTask('nightly', ['clean', 'jshint', 'jscs', 'copy:jquery', 'concat', 'copy_common', 'replace:build_version', 'final_assembly']);

};
