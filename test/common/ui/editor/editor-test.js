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

  describe('getKey', function() {
    it('should not find a key for keys undefined', function() {
      scope.keys = undefined;

      var recipient = {
        email: 'jon@smith.com'
      };
      expect(scope.getKey(recipient)).to.be.undefined;

      expect(recipient.key).to.not.exist;
    });

    it('should work', function() {
      scope.keys = [{email: 'jon@smith.com', keyid: 'a'}];

      var recipient = {
        email: 'jon@smith.com'
      };
      expect(scope.getKey(recipient).keyid).to.equal('a');

      expect(recipient.key).to.exist;
    });
  });

  describe('colorTag', function() {
    var testElem;

    beforeEach(function() {
      testElem = $('<tags-input><ul><li class="tag-item">jon@smith.com</li></ul></tags-input>');
      $(document.body).append(testElem);
    });

    afterEach(function() {
      testElem.remove();
    });

    it('should work when recipient not found', function() {
      var recipient = {
        email: 'jonny@smith.com'
      };

      scope.colorTag(recipient);
      timeout.flush();

      var classList = $('tags-input li.tag-item').attr('class').split(/\s+/);
      expect(classList.length).to.equal(1);
    });

    it('should color with no key', function() {
      var recipient = {
        email: 'jon@smith.com'
      };

      scope.colorTag(recipient);
      timeout.flush();

      var classList = $('tags-input li.tag-item').attr('class').split(/\s+/);
      expect(classList.indexOf('tag-danger') !== -1).to.be.true;
    });

    it('should color with key', function() {
      var recipient = {
        email: 'jon@smith.com',
        key: {}
      };

      scope.colorTag(recipient);
      timeout.flush();

      var classList = $('tags-input li.tag-item').attr('class').split(/\s+/);
      expect(classList.indexOf('tag-success') !== -1).to.be.true;
    });
  });

  describe('checkEncryptStatus', function() {
    it('should not encrypt for recipients undefined', function() {
      scope.recipients = undefined;
      scope.checkEncryptStatus();
      expect(scope.noEncrypt).to.be.false;
    });

    it('should not encrypt for empty recipient', function() {
      scope.recipients = [];
      scope.checkEncryptStatus();
      expect(scope.noEncrypt).to.be.false;
    });

    it('should encrypt if all recipients have keys', function() {
      scope.recipients = [{key:{}}];
      scope.checkEncryptStatus();
      expect(scope.noEncrypt).to.be.false;
    });

    it('should not encrypt if not all recipients have keys', function() {
      scope.recipients = [{key:{}}, {}];
      scope.checkEncryptStatus();
      expect(scope.noEncrypt).to.be.true;
    });
  });

  describe('autocomplete', function() {
    it('should find none for keys undefined', function() {
      scope.keys = undefined;
      expect(scope.autocomplete('jon').length).to.equal(0);
    });

    it('should find none for empty keys', function() {
      scope.keys = [];
      expect(scope.autocomplete('jon').length).to.equal(0);
    });

    it('should find none for empty user id', function() {
      scope.keys = [{email:'j@s.com'}];
      expect(scope.autocomplete('j').length).to.equal(0);
    });

    it('should find two matches', function() {
      scope.keys = [{userid: 'Jon Smith <j@s.com>'}, {userid: 'jon <j@b.com>'}];
      expect(scope.autocomplete('jOn').length).to.equal(2);
    });

    it('should find one match', function() {
      scope.keys = [{userid: 'Jon Smith <j@s.com>'}, {userid: 'jon <j@b.com>'}];
      expect(scope.autocomplete('sMith').length).to.equal(1);
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
