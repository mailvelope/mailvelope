'use strict';

module.exports = function (grunt) {

  grunt.initConfig({

    clean: ['build/', 'tmp/', 'dist/**/*'],

    jshint: {
      options: {
        jshintrc: true
      },
      all: {
        src: ['Gruntfile.js', 'common/ui/**/*.js']
      },
    },
    concat: {
      content_script: {
        options: {
          footer: '//@ sourceURL=cs-mailvelope.js'
        },
        files: [{
          src: [
            'bower_components/jquery/jquery.min.js',
            'common/ui/inline/mvelo.js',
            'common/ui/inline/main-cs.js',
            'common/ui/inline/extractFrame.js',
            'common/ui/inline/decryptFrame.js',
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
      vendor: {
        files: [
          {
            expand: true,
            cwd: 'bower_components/jquery/',
            src: 'jquery.min.js',
            dest: 'build/common/dep/'
          },
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
          }
        ]
      },
      common: {
        files: [{
          src: 'common/**/*',
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
        }]
      },
      dep: {
        files: [{
          expand: true,
          flatten: true,
          src: 'dep/chrome/openpgpjs/dist/openpgp.js',
          dest: 'build/chrome/dep/'
        },
        {
          expand: true,
          flatten: true,
          src: 'dep/firefox/openpgpjs/resources/openpgp.js',
          dest: 'build/firefox/packages/openpgp/lib/'
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
          src: ['build/chrome/**/*', '!build/chrome/**/.*']
        }]
      }
    },

    'mozilla-addon-sdk': {
      '1_15': {
        options: {
          revision: '1.15'
        }
      }
    },
    'mozilla-cfx-xpi': {
      stable: {
        options: {
          'mozilla-addon-sdk': '1_15',
          extension_dir: 'build/firefox',
          dist_dir: 'dist/',
          arguments: '--strip-sdk --output-file=mailvelope.firefox.xpi'
        }
      }
    },
    'mozilla-cfx': {
      'run_stable': {
        options: {
          "mozilla-addon-sdk": "1_15",
          extension_dir: "build/firefox",
          command: "run"
        }
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

  //custom tasks
  grunt.registerTask('dist-cr', ['compress:chrome']);
  grunt.registerTask('dist-ff', ['mozilla-addon-sdk', 'mozilla-cfx-xpi']);
  grunt.registerTask('start-ff-clean', ['mozilla-cfx:run_stable']);

  grunt.registerTask('copy_default', ['copy:vendor', 'copy:common', 'copy:plugins', 'copy:common_browser', 'copy:dep']);

  grunt.registerTask('default', ['jshint', 'modernizr', 'concat', 'copy_default']);
};
