'use strict';

module.exports = function (grunt) {

  grunt.initConfig({
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
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
};
