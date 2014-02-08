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
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('default', ['concat', 'copy']);
};
