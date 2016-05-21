/* global EditorCtrl */

'use strict';

describe('Editor UI unit tests', function() {

  var ctrl, scope, timeout;

  beforeEach(function() {
    sinon.stub(EditorCtrl.prototype, 'initComplete');
    sinon.stub(EditorCtrl.prototype, 'registerEventListeners');

    angular.module('editor-test', []);
    angular.mock.module('editor-test');
    angular.mock.inject(function($rootScope, $timeout, $controller) {
      scope = $rootScope.$new();
      timeout = $timeout;

      ctrl = $controller(EditorCtrl, {
        $scope: scope,
        $timeout: timeout
      });
    });
  });

  afterEach(function() {
    EditorCtrl.prototype.initComplete.restore();
    EditorCtrl.prototype.registerEventListeners.restore();
  });

  describe('setRecipients', function() {
    beforeEach(function() {
      sinon.stub(scope, 'verify');
    });
    afterEach(function() {
      scope.verify.restore();
    });

    it('should work', function() {
      ctrl.setRecipients({
        keys:[],
        recipients: [{}, {}]
      });
      timeout.flush();

      expect(scope.keys).to.exist;
      expect(scope.recipients).to.exist;
      expect(scope.verify.callCount).to.equal(2);
    });
  });

});
