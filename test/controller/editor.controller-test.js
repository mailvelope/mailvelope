
import EditorController from '../../src/controller/editor.controller';
import * as keyring from '../../src/modules/keyring';
import * as prefs from '../../src/modules/prefs';

describe('Editor controller unit tests', () => {
  let ctrl;
  let port;
  const preferences = prefs.prefs;
  let testRecipients;

  beforeEach(() => {
    testRecipients = [{email: 'test@example.com'}];
    port = {name: 'foo', postMessage(opt) { ctrl.handlePortMessage(opt); }};
    ctrl = new EditorController(port);

    sinon.stub(ctrl, 'emit');
    prefs.prefs = Object.assign({}, preferences);
  });

  afterEach(() => {
    ctrl.emit.restore();
    prefs.prefs = preferences;
  });

  describe('Check event handlers', () => {
    it('should handle recipients', () => {
      expect(ctrl._handlers.get('editor-init')).to.equal(ctrl._onEditorInit);
    });
  });

  describe('lookupKeyOnServer', () => {
    let importKeysStub;

    beforeEach(() => {
      sinon.stub(ctrl.keyserver, 'lookup');
      const keyRingMock = {
        importKeys() {},
        getKeyUserIDs() { return [{keyid: '0'}]; }
      };
      importKeysStub = sinon.stub(keyRingMock, 'importKeys');
      sinon.stub(keyring, 'getById').returns(keyRingMock);
    });

    afterEach(() => {
      ctrl.keyserver.lookup.restore();
      keyring.getById.restore();
    });

    it('should find a key', () => {
      ctrl.keyserver.lookup.returns(Promise.resolve({publicKeyArmored: 'KEY BLOCK'}));

      return ctrl.lookupKeyOnServer({recipient: {email: 'a@b.co'}})
      .then(() => {
        expect(importKeysStub.calledOnce).to.be.true;
        expect(ctrl.emit.calledOnce).to.be.true;
      });
    });

    it('should not find a key', () => {
      ctrl.keyserver.lookup.returns(Promise.resolve());

      return ctrl.lookupKeyOnServer({recipient: {email: 'a@b.co'}})
      .then(() => {
        expect(importKeysStub.calledOnce).to.be.false;
        expect(ctrl.emit.calledOnce).to.be.true;
      });
    });
  });

  describe('displayRecipientProposal', () => {
    beforeEach(() => {
      sinon.stub(keyring, 'getById').returns({
        getKeyUserIDs() { return [{keyid: '0'}]; }
      });
      sinon.stub(ctrl.keyserver, 'getTOFUPreference').returns(true);
    });

    afterEach(() => {
      keyring.getById.restore();
      ctrl.keyserver.getTOFUPreference.restore();
    });

    it('should handle empty recipients', () => {
      ctrl.displayRecipientProposal([]);
      expect(ctrl.emit.withArgs('public-key-userids', {keys: [{keyid: '0'}], recipients: [], tofu: true}).calledOnce).to.be.true;
    });

    it('should handle undefined recipients', () => {
      ctrl.displayRecipientProposal();
      expect(ctrl.emit.withArgs('public-key-userids', {keys: [{keyid: '0'}], recipients: [], tofu: true}).calledOnce).to.be.true;
    });

    it('should handle recipients', () => {
      ctrl.displayRecipientProposal(testRecipients);
      expect(ctrl.emit.withArgs('public-key-userids', {keys: [{keyid: '0'}], recipients: testRecipients, tofu: true}).calledOnce).to.be.true;
    });
  });

  describe('transferEncrypted', () => {
    beforeEach(() => {
      ctrl.encryptCallback = function() {};
      sinon.stub(ctrl, 'encryptCallback');
    });

    it('should not transfer private key material', () => {
      ctrl.transferEncrypted({
        armored: 'a',
        keys: [{name: 'n', email: 'e', private: 'p'}]
      });
      expect(ctrl.encryptCallback.withArgs(null, 'a', [{name: 'n', email: 'e'}]).calledOnce).to.be.true;
    });

    it('should emit message to encrypt container', () => {
      ctrl.ports = {editorCont: {}};
      ctrl.transferEncrypted({
        armored: 'a',
        keys: [{name: 'n', email: 'e', private: 'p'}]
      });
      expect(ctrl.encryptCallback.called).to.be.false;
      expect(ctrl.emit.withArgs('encrypted-message', {message: 'a'}, {}).calledOnce).to.be.true;
    });
  });

  describe('signAndEncrypt', () => {
    let keys;

    beforeEach(() => {
      keys = [{name: 'n', email: 'e', private: 'p'}];
      sinon.stub(ctrl, 'buildMail');
      sinon.stub(ctrl, 'getPublicKeyIds');
      sinon.stub(ctrl, 'signAndEncryptMessage');
      sinon.stub(ctrl, 'encryptMessage');
      sinon.stub(ctrl, 'signMessage');
    });

    afterEach(() => {
      ctrl.buildMail.restore();
      ctrl.getPublicKeyIds.restore();
      ctrl.signAndEncryptMessage.restore();
      ctrl.encryptMessage.restore();
      ctrl.signMessage.restore();
    });

    it('should encrypt', () => {
      ctrl.encryptMessage.returns(Promise.resolve('a'));
      return ctrl.signAndEncrypt({
        action: 'encrypt',
        message: 'm',
        keys
      })
      .then(res => {
        expect(res).to.equal('a');
      });
    });

    it('should sign and encrypt', () => {
      ctrl.signMsg = true;
      ctrl.signAndEncryptMessage.returns(Promise.resolve('a'));
      return ctrl.signAndEncrypt({
        action: 'encrypt',
        message: 'm',
        keys
      })
      .then(res => {
        expect(res).to.equal('a');
      });
    });

    it('should sign', () => {
      ctrl.signMessage.returns(Promise.resolve('a'));
      return ctrl.signAndEncrypt({
        action: 'sign',
        message: 'm'
      })
      .then(res => {
        expect(res).to.equal('a');
      });
    });

    it('should handle build MIME error', done => {
      ctrl.buildMail.returns(null);
      ctrl.signAndEncrypt({
        action: 'encrypt',
        message: 'm'
      })
      .catch(err => {
        expect(err.message).to.be.equal('MIME building failed.');
        done();
      });
    });
  });

  describe('getPublicKeyIds', () => {
    const keys = [{keyid: 'b'}, {keyid: 'b'}];

    beforeEach(() => {
      sinon.stub(keyring, 'getById').returns({
        getAttributes() { return {primary_key: 'p'}; },
        getPrimaryKey: () => ({keyid: 'P'})
      });
      prefs.prefs = {
        general: {
          auto_add_primary: false
        }
      };
    });

    afterEach(() => {
      keyring.getById.restore();
    });

    it('should return keybuffer', () => {
      ctrl.keyidBuffer = ['a', 'a'];

      expect(ctrl.getPublicKeyIds(keys)).to.deep.equal(['a']);
    });

    it('should return key ids', () => {
      ctrl.keyidBuffer = undefined;

      expect(ctrl.getPublicKeyIds(keys)).to.deep.equal(['b']);
    });

    it('should return key ids with primary', () => {
      prefs.prefs = {
        general: {
          auto_add_primary: true
        }
      };
      ctrl.keyidBuffer = undefined;

      expect(ctrl.getPublicKeyIds(keys)).to.deep.equal(['b', 'p']);
    });
  });
});
