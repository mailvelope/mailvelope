/* global mvelo */

'use strict';

describe('Editor UI unit tests', function() {

  var editor;

  beforeEach(function() {
    editor = new mvelo.Editor();
  });

  afterEach(function() {});

  describe('setRecipients', function() {
    it('should work', function() {
      editor.setRecipients({
        keys:[]
      });
    });
  });

});
