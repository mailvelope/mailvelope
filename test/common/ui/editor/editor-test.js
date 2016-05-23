/* global EditorCtrl */

'use strict';

describe('Editor UI unit tests', function() {

  var ctrl, scope;

  beforeEach(function() {
    sinon.stub(EditorCtrl.prototype, 'initComplete');
    sinon.stub(EditorCtrl.prototype, 'registerEventListeners');
    $.parseQuerystring = $.parseQuerystring || function() {};
    sinon.stub($, 'parseQuerystring', function() { return {embedded:false}; });

    angular.module('editor-test', []);
    angular.mock.module('editor-test');
    angular.mock.inject(function($rootScope, $timeout, $controller) {
      scope = $rootScope.$new();

      ctrl = $controller(EditorCtrl, {
        $scope: scope,
        $timeout: $timeout
      });
    });
  });

  afterEach(function() {
    EditorCtrl.prototype.initComplete.restore();
    EditorCtrl.prototype.registerEventListeners.restore();
    $.parseQuerystring.restore();
  });

  describe('verify', function() {
    beforeEach(function() {
      sinon.stub(ctrl, 'getKey');
      sinon.stub(ctrl, 'colorTag');
      sinon.stub(ctrl, 'checkEncryptStatus');
    });
    afterEach(function() {
      ctrl.getKey.restore();
      ctrl.colorTag.restore();
      ctrl.checkEncryptStatus.restore();
    });

    it('should display only email address', function() {
      var recipient = {
        email: 'jon@smith.com',
        displayId: 'Jon Smith <jon@smith.com>'
      };

      ctrl.verify(recipient);

      expect(recipient.displayId).to.equal('jon@smith.com');
      expect(ctrl.getKey.withArgs(recipient).calledOnce).to.be.true;
      expect(ctrl.colorTag.withArgs(recipient).calledOnce).to.be.true;
      expect(ctrl.checkEncryptStatus.calledOnce).to.be.true;
    });

    it('should set email', function() {
      var recipient = {
        displayId: 'jon@smith.com'
      };

      ctrl.verify(recipient);

      expect(recipient.email).to.equal('jon@smith.com');
    });

    it('should work for undefined', function() {
      ctrl.verify(undefined);

      expect(ctrl.getKey.called).to.be.false;
      expect(ctrl.colorTag.called).to.be.false;
      expect(ctrl.checkEncryptStatus.called).to.be.false;
    });
  });

  describe('getKey', function() {
    it('should not find a key for keys undefined', function() {
      ctrl.keys = undefined;

      var recipient = {
        email: 'jon@smith.com'
      };
      expect(ctrl.getKey(recipient)).to.be.undefined;

      expect(recipient.key).to.not.exist;
    });

    it('should not find matching key', function() {
      ctrl.keys = [{email: 'JO@smith.com', keyid: 'a'}];

      var recipient = {
        email: 'jon@smith.com'
      };
      expect(ctrl.getKey(recipient)).to.be.undefined;

      expect(recipient.key).to.not.exist;
    });

    it('should work for uppercase input', function() {
      ctrl.keys = [{email: 'jon@smith.com', keyid: 'a'}];

      var recipient = {
        email: 'JON@smith.com'
      };
      expect(ctrl.getKey(recipient).keyid).to.equal('a');

      expect(recipient.key).to.exist;
    });

    it('should work for lowercase input', function() {
      ctrl.keys = [{email: 'JON@smith.com', keyid: 'a'}];

      var recipient = {
        email: 'jon@smith.com'
      };
      expect(ctrl.getKey(recipient).keyid).to.equal('a');

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

      ctrl.colorTag(recipient);
      ctrl._timeout.flush();

      var classList = $('tags-input li.tag-item').attr('class').split(/\s+/);
      expect(classList.length).to.equal(1);
    });

    it('should color with no key', function() {
      var recipient = {
        email: 'jon@smith.com'
      };

      ctrl.colorTag(recipient);
      ctrl._timeout.flush();

      var classList = $('tags-input li.tag-item').attr('class').split(/\s+/);
      expect(classList.indexOf('tag-danger') !== -1).to.be.true;
    });

    it('should color with key', function() {
      var recipient = {
        email: 'jon@smith.com',
        key: {}
      };

      ctrl.colorTag(recipient);
      ctrl._timeout.flush();

      var classList = $('tags-input li.tag-item').attr('class').split(/\s+/);
      expect(classList.indexOf('tag-success') !== -1).to.be.true;
    });
  });

  describe('checkEncryptStatus', function() {
    it('should not encrypt for recipients undefined', function() {
      ctrl.recipients = undefined;
      ctrl.checkEncryptStatus();
      expect(ctrl.noEncrypt).to.be.false;
    });

    it('should not encrypt for empty recipient', function() {
      ctrl.recipients = [];
      ctrl.checkEncryptStatus();
      expect(ctrl.noEncrypt).to.be.false;
    });

    it('should encrypt if all recipients have keys', function() {
      ctrl.recipients = [{key:{}}];
      ctrl.checkEncryptStatus();
      expect(ctrl.noEncrypt).to.be.false;
    });

    it('should not encrypt if not all recipients have keys', function() {
      ctrl.recipients = [{key:{}}, {}];
      ctrl.checkEncryptStatus();
      expect(ctrl.noEncrypt).to.be.true;
    });
  });

  describe('autocomplete', function() {
    it('should find none for keys undefined', function() {
      ctrl.keys = undefined;
      expect(ctrl.autocomplete('jon').length).to.equal(0);
    });

    it('should find none for empty keys', function() {
      ctrl.keys = [];
      expect(ctrl.autocomplete('jon').length).to.equal(0);
    });

    it('should find none for empty user id', function() {
      ctrl.keys = [{email:'j@s.com'}];
      expect(ctrl.autocomplete('j').length).to.equal(0);
    });

    it('should find two matches', function() {
      ctrl.keys = [{userid: 'Jon Smith <j@s.com>'}, {userid: 'jon <j@b.com>'}];
      expect(ctrl.autocomplete('jOn').length).to.equal(2);
    });

    it('should find one match', function() {
      ctrl.keys = [{userid: 'Jon Smith <j@s.com>'}, {userid: 'jon <j@b.com>'}];
      expect(ctrl.autocomplete('sMith').length).to.equal(1);
    });
  });

  describe('_setRecipients', function() {
    beforeEach(function() {
      sinon.stub(ctrl, 'verify');
    });
    afterEach(function() {
      ctrl.verify.restore();
    });

    it('should work', function() {
      ctrl._setRecipients({
        keys:[],
        recipients: [{}, {}]
      });
      ctrl._timeout.flush();

      expect(ctrl.keys).to.exist;
      expect(ctrl.recipients).to.exist;
      expect(ctrl.verify.callCount).to.equal(2);
    });
  });

});
