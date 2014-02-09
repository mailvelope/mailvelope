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
            'common/dep/jquery.min.js',
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

    copy: {
      bootstrap: {
        files: [{
          expand: true,
          cwd: 'bower_components/bootstrap/docs/assets/',
          src: [
            'css/bootstrap.css',
            'js/bootstrap.js',
            'img/glyphicons*'
          ],
          dest: 'build/common/dep/bootstrap/'
        }]
      },
      common: {
        files: [{
          src: 'common/**/*',
          dest: 'build/chrome/'
        },
        {
          expand: true,
          src: 'common/**/*',
          cwd: 'build/',
          dest: 'build/chrome/'
        },
        {
          expand: true,
          src: 'common/**/*',
          cwd: 'build/',
          dest: 'build/firefox/data/'
        }]
      },
      plugins: {
        files: [{
          src: ['chrome/**/*', 'firefox/**/*'],
          dest: 'build/'
        }]
      },
      dep: {
        files: [{
          expand: true,
          flatten: true,
          src: 'dep/chrome/openpgpjs/resources/openpgp.js',
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
        files: ['Gruntfile.js', 'common/**/*', '!common/dep'],
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
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-mozilla-addon-sdk');

  //custom tasks
  grunt.registerTask('dist-cr', ['compress:chrome']);
  grunt.registerTask('dist-ff', ['mozilla-addon-sdk', 'mozilla-cfx-xpi']);

  grunt.registerTask('default', ['jshint', 'concat', 'copy']);
};
