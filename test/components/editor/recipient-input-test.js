
import {RecipientInputCtrl, RecipientInput} from '../../../src/components/editor/components/RecipientInput';

/* global angular */

describe('RecipientInput component unit tests', () => {

  let ctrl, scope, props;

  beforeEach(() => {
    props = {recipients: []};
    // intialize props
    new RecipientInput(props);
    angular.module('recipient-input-test', []);
    angular.mock.module('recipient-input-test');
    angular.mock.inject(($rootScope, $timeout, $controller) => {
      scope = $rootScope.$new();
      ctrl = $controller(RecipientInputCtrl, {
        $scope: scope,
        $timeout: $timeout
      });
    });
  });

  describe('update', () => {

    it('should work', () => {
      sinon.stub(ctrl, 'checkEncryptStatus');
      sinon.stub(ctrl, 'verify');
      props.recipients.push(...[{}, {}]);
      ctrl.update();
      ctrl._timeout.flush();

      expect(ctrl.checkEncryptStatus.calledOnce).to.be.true;
      expect(ctrl.verify.callCount).to.equal(2);
    });

  });

  describe('verify', () => {
    beforeEach(() => {
      sinon.stub(ctrl, 'getKey');
      sinon.stub(ctrl, 'colorTag');
      sinon.stub(ctrl, 'checkEncryptStatus');
      sinon.stub(ctrl, 'lookupKeyOnServer');
    });
    afterEach(() => {
      ctrl.getKey.restore();
      ctrl.colorTag.restore();
      ctrl.checkEncryptStatus.restore();
      ctrl.lookupKeyOnServer.restore();
    });

    it('should display only email address and lookup key on server', () => {
      let recipient = {
        email: 'jon@smith.com',
        displayId: 'Jon Smith <jon@smith.com>'
      };
      props.tofu = true;

      ctrl.verify(recipient);

      expect(recipient.displayId).to.equal('jon@smith.com');
      expect(ctrl.getKey.withArgs(recipient).calledOnce).to.be.true;
      expect(ctrl.lookupKeyOnServer.withArgs(recipient).calledOnce).to.be.true;
    });

    it('should color tag if local key was found', () => {
      let recipient = {
        email: 'jon@smith.com',
        displayId: 'Jon Smith <jon@smith.com>'
      };
      ctrl.getKey.returns({keyid: '0'});

      ctrl.verify(recipient);

      expect(ctrl.colorTag.withArgs(recipient).calledOnce).to.be.true;
      expect(ctrl.checkEncryptStatus.calledOnce).to.be.true;
    });

    it('should color tag after server lookup', () => {
      let recipient = {
        email: 'jon@smith.com',
        displayId: 'Jon Smith <jon@smith.com>',
        checkedServer: true
      };

      ctrl.verify(recipient);

      expect(ctrl.colorTag.withArgs(recipient).calledOnce).to.be.true;
      expect(ctrl.checkEncryptStatus.calledOnce).to.be.true;
    });

    it('should color tag if TOFU is deactivated', () => {
      let recipient = {
        email: 'jon@smith.com',
        displayId: 'Jon Smith <jon@smith.com>',
        checkedServer: undefined
      };
      props.tofu = false;

      ctrl.verify(recipient);

      expect(ctrl.colorTag.withArgs(recipient).calledOnce).to.be.true;
      expect(ctrl.checkEncryptStatus.calledOnce).to.be.true;
    });

    it('should set email', () => {
      let recipient = {
        displayId: 'jon@smith.com'
      };

      ctrl.verify(recipient);

      expect(recipient.email).to.equal('jon@smith.com');
    });

    it('should work for undefined', () => {
      ctrl.verify(undefined);

      expect(ctrl.getKey.called).to.be.false;
      expect(ctrl.colorTag.called).to.be.false;
      expect(ctrl.checkEncryptStatus.called).to.be.false;
    });
  });

  describe('getKey', () => {

    it('should not find matching key', () => {
      props.keys = [{email: 'JO@smith.com', keyid: 'a'}];

      let recipient = {
        email: 'jon@smith.com'
      };
      expect(ctrl.getKey(recipient)).to.be.undefined;
    });

    it('should work for uppercase input', () => {
      props.keys = [{email: 'jon@smith.com', keyid: 'a'}];

      let recipient = {
        email: 'JON@smith.com'
      };
      expect(ctrl.getKey(recipient).keyid).to.equal('a');
    });

    it('should work for lowercase input', () => {
      props.keys = [{email: 'JON@smith.com', keyid: 'a'}];

      let recipient = {
        email: 'jon@smith.com'
      };
      expect(ctrl.getKey(recipient).keyid).to.equal('a');
    });
  });

  describe('colorTag', () => {
    let testElem;

    beforeEach(() => {
      testElem = $('<tags-input><ul><li class="tag-item">jon@smith.com</li></ul></tags-input>');
      $(document.body).append(testElem);
    });

    afterEach(() => {
      testElem.remove();
    });

    it('should work when recipient not found', () => {
      let recipient = {
        email: 'jonny@smith.com'
      };

      ctrl.colorTag(recipient);
      ctrl._timeout.flush();

      let classList = $('tags-input li.tag-item').attr('class').split(/\s+/);
      expect(classList.length).to.equal(1);
    });

    it('should color with no key', () => {
      let recipient = {
        email: 'jon@smith.com'
      };

      ctrl.colorTag(recipient);
      ctrl._timeout.flush();

      let classList = $('tags-input li.tag-item').attr('class').split(/\s+/);
      expect(classList.indexOf('tag-danger') !== -1).to.be.true;
    });

    it('should color with key', () => {
      let recipient = {
        email: 'jon@smith.com',
        key: {}
      };

      ctrl.colorTag(recipient);
      ctrl._timeout.flush();

      let classList = $('tags-input li.tag-item').attr('class').split(/\s+/);
      expect(classList.indexOf('tag-success') !== -1).to.be.true;
    });
  });

  describe('checkEncryptStatus', () => {

    beforeEach(() => {
      props.onChangeEncryptStatus = sinon.stub();
    });
    afterEach(() => {
      props.onChangeEncryptStatus = null;
    });

    it('should not encrypt for empty recipient', () => {
      ctrl.recipients = [];
      ctrl.checkEncryptStatus();
      expect(ctrl.noEncrypt).to.be.false;
      expect(props.onChangeEncryptStatus.withArgs({encryptDisabled: true}).calledOnce).to.be.true;
    });

    it('should encrypt if all recipients have keys', () => {
      ctrl.recipients = [{key: {}}];
      ctrl.checkEncryptStatus();
      expect(ctrl.noEncrypt).to.be.false;
      expect(props.onChangeEncryptStatus.withArgs({encryptDisabled: false}).calledOnce).to.be.true;
    });

    it('should not encrypt if not all recipients have keys', () => {
      ctrl.recipients = [{key: {}}, {}];
      ctrl.checkEncryptStatus();
      expect(ctrl.noEncrypt).to.be.true;
      expect(props.onChangeEncryptStatus.withArgs({encryptDisabled: true}).calledOnce).to.be.true;
    });
  });

  describe('lookupKeyOnServer', () => {

    beforeEach(() => {
      props.onLookupKeyOnServer = sinon.stub();
    });
    afterEach(() => {
      props.onLookupKeyOnServer = null;
    });

    it('should work', () => {
      let recipient = {};
      ctrl.lookupKeyOnServer(recipient);
      expect(recipient.checkedServer).to.be.true;
      expect(props.onLookupKeyOnServer.withArgs(recipient).calledOnce).to.be.true;
    });
  });

  describe('autocomplete', () => {
    it('should find none for empty keys', () => {
      props.keys = [];
      props.recipients.length = 0;
      expect(ctrl.autocomplete('jon').length).to.equal(0);
    });

    it('should find one for empty email', () => {
      props.keys = [{email: '', userid: 'Jon Smith', keyid: '1ddcee8ad254cc42'}];
      props.recipients.length = 0;
      expect(ctrl.autocomplete('jon').length).to.equal(1);
    });

    it('should find none if email is already in recipients', () => {
      props.keys = [{email: 'j@s.com', userid: 'Jon Smith', keyid: '1ddcee8ad254cc42'}];
      props.recipients.push({email: 'j@s.com'});
      expect(ctrl.autocomplete('jon').length).to.equal(0);
    });

    it('should find two matches', () => {
      props.keys = [{userid: 'Jon Smith <j@s.com>', keyid: '1ddcee8ad254cc42'}, {userid: 'jon <j@b.com>', keyid: '1ddcee8ad254cc41'}];
      props.recipients.length = 0;
      expect(ctrl.autocomplete('jOn').length).to.equal(2);
    });

    it('should find one match', () => {
      props.keys = [{userid: 'Jon Smith <j@s.com>', keyid: '1ddcee8ad254cc42'}, {userid: 'jon <j@b.com>', keyid: '1ddcee8ad254cc41'}];
      props.recipients.length = 0;
      expect(ctrl.autocomplete('sMith').length).to.equal(1);
    });

    it('should find match on short keyid', () => {
      props.keys = [{userid: 'Jon Smith <j@s.com>', keyid: '1ddcee8ad254cc42'}, {userid: 'jon <j@b.com>', keyid: '1ddcee8ad254cc41'}];
      props.recipients.length = 0;
      expect(ctrl.autocomplete('cc42').length).to.equal(1);
    });

    it('should concatenate userid and keyid', () => {
      props.keys = [{userid: 'Jon Smith <j@s.com>', keyid: '1ddcee8ad254cc42'}];
      props.recipients.length = 0;
      expect(ctrl.autocomplete('cc42')[0].displayId).to.equal('Jon Smith <j@s.com> - 1DDCEE8AD254CC42');
    });
  });

});
