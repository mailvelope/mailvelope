
import {expect, sinon} from 'test';
import EditorController from 'controller/editor.controller';
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
    it('should handle load', () => {
      expect(ctrl._handlers.get('editor-load')).to.exist;
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

    it('should handle empty recipients', async () => {
      prefs.prefs.keyserver = {
        wkd_lookup: true
      };
      await ctrl.setRecipientData({to: [], cc: []});
      expect(ctrl.emit.withArgs('public-key-userids', {keys: [{keyid: '0'}], to: [], cc: []}).calledOnce).to.be.true;
    });

    it('should handle undefined recipients', async () => {
      prefs.prefs.keyserver = {
        wkd_lookup: true
      };
      await ctrl.setRecipientData();
      expect(ctrl.emit.withArgs('public-key-userids', {keys: [{keyid: '0'}], to: [], cc: []}).calledOnce).to.be.true;
    });
  });

  describe('transferEncrypted', () => {
    beforeEach(() => {
      ctrl.encryptPromise = {resolve() {}, reject() {}};
      sandbox.stub(ctrl.encryptPromise, 'resolve');
    });

    it('should not transfer private key material', () => {
      ctrl.transferEncrypted({
        armored: 'a',
        encFiles: [],
        to: [{name: 'n', email: 'e', private: 'p'}],
        cc: [],
        subject: 'Test'
      });
      expect(ctrl.encryptPromise.resolve.withArgs({armored: 'a', encFiles: [], to: [{name: 'n', email: 'e'}], cc: [], subject: 'Test'}).calledOnce).to.be.true;
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
      })).to.eventually.deep.equal({armored: 'a', encFiles: []});
    });

    it('should sign and encrypt', () => {
      ctrl.signMsg = true;
      const keyringStub = sandbox.stub().returns('p');
      EditorController.__Rewire__('getDefaultKeyFpr', keyringStub);
      sandbox.stub(ctrl, 'encryptMessage').returns(Promise.resolve('a'));
      return expect(ctrl.signAndEncrypt({
        action: 'encrypt',
        message: 'm',
        signMsg: true,
        keys
      })).to.eventually.deep.equal({armored: 'a', encFiles: []});
    });

    it('should sign', () => {
      sandbox.stub(ctrl, 'signMessage').returns(Promise.resolve('a'));
      return expect(ctrl.signAndEncrypt({
        action: 'sign',
        message: 'm'
      })).to.eventually.deep.equal({armored: 'a'});
    });

    it('should handle build MIME error', () => {
      const buildMailStub = sandbox.stub().returns(null);
      EditorController.__Rewire__('buildMail', buildMailStub);
      return expect(ctrl.signAndEncrypt({
        action: 'encrypt',
        message: 'm'
      })).to.eventually.be.rejectedWith('MIME building failed');
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
