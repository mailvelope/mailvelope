/* global mvelo */

'use strict';

describe('Editor UI unit tests', function() {

  var editor, $scope, $timeout;

  beforeEach(function() {
    sinon.stub(mvelo.Editor.prototype, 'initComplete');
    sinon.stub(mvelo.Editor.prototype, 'registerEventListeners');
    $scope = {};
    $timeout = function(callback) { callback(); };
    editor = new mvelo.Editor($scope, $timeout);
  });

  afterEach(function() {
    mvelo.Editor.prototype.initComplete.restore();
    mvelo.Editor.prototype.registerEventListeners.restore();
  });

  describe('setRecipients', function() {
    it('should work', function() {
      editor.setRecipients({
        keys:[],
        recipients: []
      });
    });
  });

});
