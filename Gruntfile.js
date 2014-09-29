'use strict';

module.exports = function (grunt) {

  grunt.initConfig({

    clean: ['build/', 'dist/**/*'],

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
          'chrome/background.js',
          'chrome/lib/*.js',
          'firefox/**/*.js'
        ]
      },
    },
    concat: {
      content_script: {
        options: {
          footer: '//# sourceURL=cs-mailvelope.js'
        },
        files: [{
          src: [
            'common/ui/inline/mvelo.js',
            'common/ui/inline/main-cs.js',
            'common/ui/inline/extractFrame.js',
            'common/ui/inline/decryptFrame.js',
            'common/ui/inline/verifyFrame.js',
            'common/ui/inline/importFrame.js',
            'common/ui/inline/encryptFrame.js'
          ],
          dest: 'build/common/ui/inline/cs-mailvelope.js'
        }]
      }
    },

    modernizr: {
      dist: {
        'devFile' : 'build/common/dep/modernizr.js',
        'outputFile' : 'build/common/dep/modernizr.js',
        'extra' : {
          'shiv' : false,
          'printshiv' : false,
          'load' : true,
          'mq' : false,
          'cssclasses' : false
        },
        'uglify' : true,
        'tests' : ['inputtypes'],
        'parseFiles' : false,
        'customTests' : []
      }
    },

    copy: {
      jquery: {
        expand: true,
        cwd: 'bower_components/jquery/dist',
        src: 'jquery.min.js',
        dest: 'build/common/dep/'
      },
      vendor: {
        files: [
          {
            expand: true,
            cwd: 'bower_components/bootstrap/docs/assets/',
            src: [
              'css/bootstrap.css',
              'js/bootstrap.js',
              'img/glyphicons*'
            ],
            dest: 'build/common/dep/bootstrap/'
          },
          {
            expand: true,
            cwd: 'bower_components/',
            src: 'spectrum/spectrum.{css,js}',
            dest: 'build/common/dep/'
          },
          {
            expand: true,
            cwd: 'bower_components/kendo-ui/',
            src: [
              'js/kendo.web.min.js',
              'styles/{Default,textures}/*',
              'styles/kendo.{common,default}.min.css'
            ],
            dest: 'build/common/dep/kendoui/'
          },
          {
            expand: true,
            cwd: 'bower_components/dompurify/',
            src: 'purify.js',
            dest: 'build/common/dep/'
          },
          {
            expand: true,
            cwd: 'bower_components/css-toggle-switch/dist/',
            src: 'toggle-switch.css',
            dest: 'build/common/dep/toggle-switch/'
          },
          {
            expand: true,
            cwd: 'bower_components/requirejs/',
            src: 'require.js',
            dest: 'build/chrome/'
          }
        ]
      },
      common: {
        files: [{
          src: [
            'common/**/*',
            '!common/ui/inline/*.js',
            'common/ui/inline/mvelo.js',
            'common/ui/inline/encryptFrame.js'
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
          src: 'mvelo.js',
          cwd: 'build/common/ui/inline',
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
          process: function (content, srcpath) {
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
            'mailreader/node_modules/mimeparser/src/*.js',
            'mailreader/node_modules/mimeparser/node_modules/addressparser/src/*.js',
            'mailreader/node_modules/mimeparser/node_modules/mimefuncs/src/*.js',
            'mailreader/node_modules/stringencoding/dist/stringencoding.js'
          ],
          dest: 'build/chrome/lib/'
        },
        {
          expand: true,
          flatten: true,
          src: 'dep/firefox/openpgpjs/dist/openpgp.js',
          dest: 'build/firefox/lib/'
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
          cwd: 'node_modules/',
          src: [
            'mailreader/src/mailreader-parser.js',
            'mailreader/node_modules/mimeparser/src/*.js',
            'mailreader/node_modules/mimeparser/node_modules/addressparser/src/*.js',
            'mailreader/node_modules/mimeparser/node_modules/mimefuncs/src/*.js',
            'mailreader/node_modules/stringencoding/dist/stringencoding.js'
          ],
          dest: 'build/firefox/lib/'
        }]
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
      }
    },

    'mozilla-addon-sdk': {
      '1_17': {
        options: {
          revision: '1.17'
        }
      }
    },
    'mozilla-cfx-xpi': {
      stable: {
        options: {
          'mozilla-addon-sdk': '1_17',
          extension_dir: 'build/firefox',
          dist_dir: 'dist/',
          arguments: '--output-file=mailvelope.firefox.xpi'
        }
      }
    },
    'mozilla-cfx': {
      'run_stable': {
        options: {
          "mozilla-addon-sdk": "1_17",
          extension_dir: "build/firefox",
          command: "run"
        }
      }
    },
    bump: {
      options: {
        commit: true,
        createTag: false,
        push: false,
        files: ['package.json', 'bower.json', 'chrome/manifest.json', 'firefox/package.json']
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-mozilla-addon-sdk');
  grunt.loadNpmTasks('grunt-modernizr');
  grunt.loadNpmTasks('grunt-bump');

  //custom tasks
  grunt.registerTask('dist-cr', ['compress:chrome']);
  grunt.registerTask('dist-ff', ['mozilla-addon-sdk', 'mozilla-cfx-xpi']);
  grunt.registerTask('start-ff-clean', ['mozilla-cfx:run_stable']);

  grunt.registerTask('copy_default', ['copy:vendor', 'copy:common', 'copy:plugins', 'copy:common_browser', 'copy:locale_firefox', 'copy:dep']);

  grunt.registerTask('default', ['jshint', 'modernizr', 'copy:jquery', 'concat', 'copy_default']);
};
