'use strict';

module.exports = function (grunt) {

  grunt.initConfig({
    jshint: {
      options: {
        jshintrc: true
      },
      all: {
        src: ['Gruntfile.js', 'common/ui/**/*.js', '!common/ui/inline/build/*']
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
          dest: 'common/ui/inline/build/cs-mailvelope.js'
        }]
      }
    },

    copy: {
      common: {
        files: [{
          src: 'common/**/*',
          dest: 'chrome/'
        },
        {
          src: 'common/**/*',
          dest: 'firefox/data/'
        }]
      },
      dep: {
        files: [{
          expand: true,
          flatten: true,
          src: 'dep/chrome/openpgpjs/resources/openpgp.js',
          dest: 'chrome/dep/'
        },
        {
          expand: true,
          flatten: true,
          src: 'dep/firefox/openpgpjs/resources/openpgp.js',
          dest: 'firefox/packages/openpgp/lib/'
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
          src: ['chrome/**/*', '!chrome/**/.*']
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
          extension_dir: 'firefox',
          dist_dir: 'dist/',
          arguments: '--strip-sdk --output-file=mailvelope.firefox.xpi'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-mozilla-addon-sdk');

  //custom tasks
  grunt.registerTask('dist-cr', ['compress:chrome']);
  grunt.registerTask('dist-ff', ['mozilla-addon-sdk', 'mozilla-cfx-xpi']);

  grunt.registerTask('default', ['concat', 'copy']);
};
