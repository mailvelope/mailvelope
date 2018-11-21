
import {expect, sinon} from 'test';
import EditorController from 'controller/editor.controller';
import * as keyring from 'modules/keyring';
import * as prefs from 'modules/prefs';
import {Port} from 'utils';

describe('Editor controller unit tests', () => {
  const sandbox = sinon.createSandbox();
  let ctrl;
  let port;

  beforeEach(() => {
    port = new Port('editor-1');
    ctrl = new EditorController(port);
  });

  afterEach(() => {
    sandbox.restore();
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  describe('Check event handlers', () => {
    it('should handle recipients', () => {
      expect(ctrl._handlers.get('editor-init')).to.exist;
    });
  });

  /* lookupKeyOnServer does not exist anymore */
  describe.skip('lookupKeyOnServer', () => {
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

  describe('setRecipientData', () => {
    beforeEach(() => {
      const keyringStub = sandbox.stub().returns([{keyid: '0'}]);
      EditorController.__Rewire__('getKeyData', keyringStub);
      sandbox.stub(ctrl, 'emit');
    });

    afterEach(() => {
      EditorController.__ResetDependency__('getKeyData');
    });

    it('should handle empty recipients', () => {
      prefs.prefs.keyserver = {
        wkd_lookup: true
      };
      return ctrl.setRecipientData([]).then(() => {
        expect(ctrl.emit.withArgs('public-key-userids', {keys: [{keyid: '0'}], recipients: [], autoLocate: true}).calledOnce).to.be.true;
      });
    });

    it('should handle undefined recipients', () => {
      prefs.prefs.keyserver = {
        wkd_lookup: true
      };

      return ctrl.setRecipientData().then(() => {
        expect(ctrl.emit.withArgs('public-key-userids', {keys: [{keyid: '0'}], recipients: [], autoLocate: true}).calledOnce).to.be.true;
      });
    });
  });

  describe('transferEncrypted', () => {
    beforeEach(() => {
      ctrl.encryptDone = {resolve() {}, reject() {}};
      sandbox.stub(ctrl.encryptDone, 'resolve');
    });

    it('should not transfer private key material', () => {
      ctrl.transferEncrypted({
        armored: 'a',
        keys: [{name: 'n', email: 'e', private: 'p'}]
      });
      expect(ctrl.encryptDone.resolve.withArgs({armored: 'a', recipients: [{name: 'n', email: 'e'}]}).calledOnce).to.be.true;
    });
  });

  describe('signAndEncrypt', () => {
    let keys;

    beforeEach(() => {
      keys = [{name: 'n', email: 'e', private: 'p', fingerprint: 'G'}];
      sandbox.stub(ctrl, 'getPublicKeyFprs').returns(Promise.resolve());
    });

    it('should encrypt', () => {
      sandbox.stub(ctrl, 'encryptMessage').returns(Promise.resolve('a'));
      return expect(ctrl.signAndEncrypt({
        action: 'encrypt',
        message: 'm',
        keys
      })).to.eventually.equal('a');
    });

    it('should sign and encrypt', () => {
      ctrl.signMsg = true;
      sandbox.stub(ctrl, 'signAndEncryptMessage').returns(Promise.resolve('a'));
      return expect(ctrl.signAndEncrypt({
        action: 'encrypt',
        message: 'm',
        signMsg: true,
        keys
      })).to.eventually.equal('a');
    });

    it('should sign', () => {
      sandbox.stub(ctrl, 'signMessage').returns(Promise.resolve('a'));
      return expect(ctrl.signAndEncrypt({
        action: 'sign',
        message: 'm'
      })).to.eventually.equal('a');
    });

    it('should handle build MIME error', () => {
      const buildMailStub = sandbox.stub().returns(null);
      EditorController.__Rewire__('buildMail', buildMailStub);
      return expect(ctrl.signAndEncrypt({
        action: 'encrypt',
        message: 'm'
      })).to.eventually.be.rejectedWith('MIME building failed').then(() => {
        EditorController.__ResetDependency__('buildMail');
      });
    });
  });

  describe('getPublicKeyFprs', () => {
    const keys = [{fingerprint: 'b'}, {fingerprint: 'c'}];

    beforeEach(() => {
      const keyringStub = sandbox.stub().returns({
        getDefaultKeyFpr() { return 'p'; }
      });
      EditorController.__Rewire__('getKeyringById', keyringStub);
      prefs.prefs.general = {
        auto_add_primary: false
      };
    });

    afterEach(() => {
      EditorController.__ResetDependency__('getKeyringById');
    });

    it('should return keybuffer', () => {
      ctrl.keyFprBuffer = ['a'];
      return expect(ctrl.getPublicKeyFprs(keys)).to.eventually.deep.equal(['a']);
    });

    it('should return key ids', () => {
      ctrl.keyFprBuffer = undefined;
      return expect(ctrl.getPublicKeyFprs(keys)).to.eventually.deep.equal(['b', 'c']);
    });

    it('should return key ids with primary', () => {
      prefs.prefs.general = {
        auto_add_primary: true
      };
      ctrl.keyFprBuffer = undefined;
      return expect(ctrl.getPublicKeyFprs(keys)).to.eventually.deep.equal(['b', 'c', 'p']);
    });
  });
});
