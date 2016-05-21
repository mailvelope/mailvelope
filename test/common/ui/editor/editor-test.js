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

  describe('verify', function() {
    beforeEach(function() {
      sinon.stub(scope, 'getKey');
      sinon.stub(scope, 'colorTag');
      sinon.stub(scope, 'checkEncryptStatus');
    });
    afterEach(function() {
      scope.getKey.restore();
      scope.colorTag.restore();
      scope.checkEncryptStatus.restore();
    });

    it('should display only email address', function() {
      var recipient = {
        email: 'jon@smith.com',
        displayId: 'Jon Smith <jon@smith.com>'
      };

      scope.verify(recipient);

      expect(recipient.displayId).to.equal('jon@smith.com');
      expect(scope.getKey.withArgs(recipient).calledOnce).to.be.true;
      expect(scope.colorTag.withArgs(recipient).calledOnce).to.be.true;
      expect(scope.checkEncryptStatus.calledOnce).to.be.true;
    });

    it('should set email', function() {
      var recipient = {
        displayId: 'jon@smith.com'
      };

      scope.verify(recipient);

      expect(recipient.email).to.equal('jon@smith.com');
    });

    it('should work for undefined', function() {
      scope.verify(undefined);

      expect(scope.getKey.called).to.be.false;
      expect(scope.colorTag.called).to.be.false;
      expect(scope.checkEncryptStatus.called).to.be.false;
    });
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
