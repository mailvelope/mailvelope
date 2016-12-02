
import EditorCtrl from '../../../src/components/editor/editor.js';

/* global angular */

describe('Editor UI unit tests', function() {

  var ctrl, scope;

  beforeEach(function() {
    sinon.stub(EditorCtrl.prototype, 'initComplete');
    sinon.stub(EditorCtrl.prototype, 'registerEventListeners');
    sinon.stub(EditorCtrl.prototype, 'checkEnvironment');
    sinon.stub(EditorCtrl.prototype, 'emit');

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
    EditorCtrl.prototype.checkEnvironment.restore();
    EditorCtrl.prototype.emit.restore();
  });

  describe('checkEnvironment', function() {
    beforeEach(function() {
      EditorCtrl.prototype.checkEnvironment.restore();
      $.parseQuerystring = $.parseQuerystring || function() {};
      sinon.stub($, 'parseQuerystring', function() {
        return {
          embedded: true,
          id: '12345'
        };
      });
    });

    afterEach(function() {
      $.parseQuerystring.restore();
      sinon.stub(EditorCtrl.prototype, 'checkEnvironment');
    });

    it('should work', function() {
      expect(ctrl.embedded).to.not.exist;
      ctrl.checkEnvironment();
      expect(ctrl.embedded).to.be.true;
      expect(ctrl._id).to.equal('12345');
      expect(ctrl._name).to.equal('editor-12345');
    });
  });

  describe('verify', function() {
    beforeEach(function() {
      sinon.stub(ctrl, 'getKey');
      sinon.stub(ctrl, 'colorTag');
      sinon.stub(ctrl, 'checkEncryptStatus');
      sinon.stub(ctrl, 'lookupKeyOnServer');
    });
    afterEach(function() {
      ctrl.getKey.restore();
      ctrl.colorTag.restore();
      ctrl.checkEncryptStatus.restore();
      ctrl.lookupKeyOnServer.restore();
    });

    it('should display only email address and lookup key on server', function() {
      var recipient = {
        email: 'jon@smith.com',
        displayId: 'Jon Smith <jon@smith.com>'
      };
      ctrl.tofu = true;

      ctrl.verify(recipient);

      expect(recipient.displayId).to.equal('jon@smith.com');
      expect(ctrl.getKey.withArgs(recipient).calledOnce).to.be.true;
      expect(ctrl.lookupKeyOnServer.withArgs(recipient).calledOnce).to.be.true;
    });

    it('should color tag if local key was found', function() {
      var recipient = {
        email: 'jon@smith.com',
        displayId: 'Jon Smith <jon@smith.com>'
      };
      ctrl.getKey.returns({keyid: '0'});

      ctrl.verify(recipient);

      expect(ctrl.colorTag.withArgs(recipient).calledOnce).to.be.true;
      expect(ctrl.checkEncryptStatus.calledOnce).to.be.true;
    });

    it('should color tag after server lookup', function() {
      var recipient = {
        email: 'jon@smith.com',
        displayId: 'Jon Smith <jon@smith.com>',
        checkedServer: true
      };

      ctrl.verify(recipient);

      expect(ctrl.colorTag.withArgs(recipient).calledOnce).to.be.true;
      expect(ctrl.checkEncryptStatus.calledOnce).to.be.true;
    });

    it('should color tag if TOFU is deactivated', function() {
      var recipient = {
        email: 'jon@smith.com',
        displayId: 'Jon Smith <jon@smith.com>',
        checkedServer: undefined
      };
      ctrl.tofu = false;

      ctrl.verify(recipient);

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
    });

    it('should not find matching key', function() {
      ctrl.keys = [{email: 'JO@smith.com', keyid: 'a'}];

      var recipient = {
        email: 'jon@smith.com'
      };
      expect(ctrl.getKey(recipient)).to.be.undefined;
    });

    it('should work for uppercase input', function() {
      ctrl.keys = [{email: 'jon@smith.com', keyid: 'a'}];

      var recipient = {
        email: 'JON@smith.com'
      };
      expect(ctrl.getKey(recipient).keyid).to.equal('a');
    });

    it('should work for lowercase input', function() {
      ctrl.keys = [{email: 'JON@smith.com', keyid: 'a'}];

      var recipient = {
        email: 'jon@smith.com'
      };
      expect(ctrl.getKey(recipient).keyid).to.equal('a');
    });
  });

  describe('lookupKeyOnServer', function() {
    it('should emit', function() {
      ctrl._name = 'foo';

      var recipient = {};
      ctrl.lookupKeyOnServer(recipient);

      expect(recipient.checkedServer).to.be.true;
      expect(ctrl.emit.withArgs('keyserver-lookup', {
        sender: 'foo',
        recipient: recipient
      }).calledOnce).to.be.true;
    });
  });

  describe('_onKeyServerResponse', function() {
    beforeEach(function() {
      sinon.stub(ctrl, 'verify');
    });
    afterEach(function() {
      ctrl.verify.restore();
    });

    it('should work', function() {
      ctrl.recipients = [{}, {}];
      ctrl._onKeyServerResponse({
        keys: [{}],
      });
      ctrl._timeout.flush();

      expect(ctrl.keys.length).to.equal(1);
      expect(ctrl.recipients.length).to.equal(2);
      expect(ctrl.verify.callCount).to.equal(2);
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

  describe.skip('checkEncryptStatus', function() {
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
      ctrl.recipients = [{key: {}}];
      ctrl.checkEncryptStatus();
      expect(ctrl.noEncrypt).to.be.false;
    });

    it('should not encrypt if not all recipients have keys', function() {
      ctrl.recipients = [{key: {}}, {}];
      ctrl.checkEncryptStatus();
      expect(ctrl.noEncrypt).to.be.true;
    });
  });

  describe('autocomplete', function() {
    it('should find none for keys undefined', function() {
      ctrl.keys = undefined;
      ctrl.recipients = [];
      expect(ctrl.autocomplete('jon').length).to.equal(0);
    });

    it('should find none for empty keys', function() {
      ctrl.keys = [];
      ctrl.recipients = [];
      expect(ctrl.autocomplete('jon').length).to.equal(0);
    });

    it('should find one for empty email', function() {
      ctrl.keys = [{email: '', userid: 'Jon Smith', keyid: '1ddcee8ad254cc42'}];
      ctrl.recipients = [];
      expect(ctrl.autocomplete('jon').length).to.equal(1);
    });

    it('should find none if email is already in recipients', function() {
      ctrl.keys = [{email: 'j@s.com', userid: 'Jon Smith', keyid: '1ddcee8ad254cc42'}];
      ctrl.recipients = [{email: 'j@s.com'}];
      expect(ctrl.autocomplete('jon').length).to.equal(0);
    });

    it('should find two matches', function() {
      ctrl.keys = [{userid: 'Jon Smith <j@s.com>', keyid: '1ddcee8ad254cc42'}, {userid: 'jon <j@b.com>', keyid: '1ddcee8ad254cc41'}];
      ctrl.recipients = [];
      expect(ctrl.autocomplete('jOn').length).to.equal(2);
    });

    it('should find one match', function() {
      ctrl.keys = [{userid: 'Jon Smith <j@s.com>', keyid: '1ddcee8ad254cc42'}, {userid: 'jon <j@b.com>', keyid: '1ddcee8ad254cc41'}];
      ctrl.recipients = [];
      expect(ctrl.autocomplete('sMith').length).to.equal(1);
    });

    it('should find match on short keyid', function() {
      ctrl.keys = [{userid: 'Jon Smith <j@s.com>', keyid: '1ddcee8ad254cc42'}, {userid: 'jon <j@b.com>', keyid: '1ddcee8ad254cc41'}];
      ctrl.recipients = [];
      expect(ctrl.autocomplete('cc42').length).to.equal(1);
    });

    it('should concatenate userid and keyid', function() {
      ctrl.keys = [{userid: 'Jon Smith <j@s.com>', keyid: '1ddcee8ad254cc42'}];
      ctrl.recipients = [];
      expect(ctrl.autocomplete('cc42')[0].displayId).to.equal('Jon Smith <j@s.com> - 1DDCEE8AD254CC42');
    });
  });

  describe('_setRecipients', function() {
    beforeEach(function() {
      sinon.stub(ctrl, 'verify');
      sinon.stub(ctrl, 'checkEncryptStatus');
    });
    afterEach(function() {
      ctrl.verify.restore();
      ctrl.checkEncryptStatus.restore();
    });

    it('should work', function() {
      ctrl._setRecipients({
        tofu: true,
        keys: [],
        recipients: [{}, {}]
      });
      ctrl._timeout.flush();

      expect(ctrl.tofu).to.be.true;
      expect(ctrl.keys).to.exist;
      expect(ctrl.recipients).to.exist;
      expect(ctrl.verify.callCount).to.equal(2);
      expect(ctrl.checkEncryptStatus.calledOnce).to.be.true;
    });
  });

  describe('getRecipientKeys', function() {
    it('should still return email address if recipient has no key', function() {
      ctrl.recipients = [{
        email: 'j@s.com',
        key: {email: 'j@s.com', keyid: '123'}
      }, {
        email: 'a@b.com'
      }];

      var keys = ctrl.getRecipientKeys();
      expect(keys.length).to.equal(2);
      expect(keys[0]).to.deep.equal({email: 'j@s.com', keyid: '123'});
      expect(keys[1]).to.deep.equal({email: 'a@b.com'});
    });
    it('return empty array if recipients undefined', function() {
      ctrl.recipients = null;
      var keys = ctrl.getRecipientKeys();
      expect(keys).to.be.a('array');
      expect(keys).to.be.empty;
    });
  });

  describe('initComplete', function() {
    it('should emit', function() {
      EditorCtrl.prototype.initComplete.restore();

      ctrl._name = 'foo';
      ctrl.initComplete();
      expect(ctrl.emit.withArgs('editor-init', {sender: 'foo'}).calledOnce).to.be.true;

      sinon.stub(EditorCtrl.prototype, 'initComplete');
    });
  });

  describe('openSecuritySettings', function() {
    it('should emit for embedded mode', function() {
      ctrl._name = 'foo';
      ctrl.embedded = true;
      ctrl.openSecuritySettings();
      expect(ctrl.emit.withArgs('open-security-settings', {sender: 'foo'}).calledOnce).to.be.true;
    });

    it('should not emit for non-embedded mode', function() {
      ctrl.embedded = false;
      ctrl.openSecuritySettings();
      expect(ctrl.emit.called).to.be.false;
    });
  });

  describe.skip('sendPlainText', function() {
    it('should emit', function() {
      sinon.stub(ctrl, 'getEditorText').returns('bar');
      sinon.stub(ctrl, 'getRecipientKeys').returns([{keyid: '123'}]);
      sinon.stub(ctrl, 'getAttachments').returns([{filename: 'file'}]);
      ctrl._name = 'foo';

      ctrl.sendPlainText('encrypt');

      expect(ctrl.emit.withArgs('editor-plaintext', {
        sender: 'foo',
        message: 'bar',
        keys: [{keyid: '123'}],
        attachments: [{filename: 'file'}],
        action: 'encrypt'
      }).calledOnce).to.be.true;
    });
  });

  describe('logUserInput', function() {
    it('should emit', function() {
      ctrl._name = 'foo';

      ctrl.logUserInput('blub');

      expect(ctrl.emit.withArgs('editor-user-input', {
        sender: 'foo',
        source: 'security_log_editor',
        type: 'blub'
      }).calledOnce).to.be.true;
    });
  });

  describe('encrypt', function() {
    it('should call sendPlaintext', function() {
      sinon.stub(ctrl, 'logUserInput');
      sinon.stub(ctrl, 'sendPlainText');

      ctrl.encrypt();

      expect(ctrl.logUserInput.withArgs('security_log_dialog_encrypt').calledOnce).to.be.true;
      expect(ctrl.sendPlainText.withArgs('encrypt').calledOnce).to.be.true;
    });
  });

  describe.skip('sign', function() {
    it('should open signDialog', function() {
      sinon.stub(ctrl, 'logUserInput');
      ctrl._name = 'foo';

      ctrl.sign();

      expect(ctrl.logUserInput.withArgs('security_log_dialog_sign').calledOnce).to.be.true;
      expect(ctrl.emit.withArgs('sign-only', {
        sender: 'foo'
      }).calledOnce).to.be.true;
    });
  });

  describe('cancel', function() {
    it('should emit', function() {
      sinon.stub(ctrl, 'logUserInput');
      ctrl._name = 'foo';

      ctrl.cancel();

      expect(ctrl.logUserInput.withArgs('security_log_dialog_cancel').calledOnce).to.be.true;
      expect(ctrl.emit.withArgs('editor-cancel', {
        sender: 'foo'
      }).calledOnce).to.be.true;
    });
  });

});
