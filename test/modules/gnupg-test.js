import {expect, sinon} from 'test';
import {decrypt, encrypt, __RewireAPI__ as GnupgRewireApi} from 'modules/gnupg';
import mvelo from 'lib/lib-mvelo';

describe('Gnupg unit test', () => {
  const sandbox = sinon.createSandbox();
  const msg = 'This is a test message!';

  afterEach(() => {
    sandbox.restore();
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  describe('decrypt', () => {
    let decryptStub;

    beforeEach(() => {
      decryptStub = sandbox.stub();
      GnupgRewireApi.__Rewire__('gpgme', {
        decrypt: decryptStub
      });
    });

    it('should return decrypted message (binary) and signatures', () => {
      const binaryMsg = window.btoa(msg);
      decryptStub.returns(Promise.resolve(
        {
          data: binaryMsg,
          signatures: {
            signatures: {
              good: [
                {
                  fingerprint: '2CE0 DBDC B17A EA6F 33B0 28C1 F1E7 0322 973D FEDE'
                },
                {
                  fingerprint: 'F1E70322973DFEDE'
                }
              ],
              bad: [
                {
                  fingerprint: '2CE0 DBDC B17A EA6F 33B0 28C1 F1E7 0322 973D HS34',
                  errorDetails: {
                    'key-missing': true
                  },
                },
                {
                  fingerprint: '2CE0 DBDC B17A EA6F 33B0 28C1 F1E7 0322 973D 7FG2',
                  errorDetails: {
                    'key-missing': false,
                  },
                  _rawSigObject: {
                    status_code: 0,
                    validity: 3
                  }
                },
                {
                  fingerprint: '2CE0 DBDC B17A EA6F 33B0 28C1 F1E7 0322 973D DEL5',
                  errorDetails: {
                    'key-missing': false,
                  },
                  _rawSigObject: {
                    status_code: 0,
                    validity: 0
                  }
                }
              ]
            }
          },
          file_name: '',
          format: 'base64'
        }
      ));
      return decrypt({armored: '', format: 'binary'}).then(result => {
        expect(decryptStub.calledOnce).to.be.true;
        const {data, signatures} = result;
        expect(data).to.equal(msg);
        expect(signatures).to.have.deep.members([
          {valid: true, fingerprint: '2ce0 dbdc b17a ea6f 33b0 28c1 f1e7 0322 973d fede'},
          {valid: true, keyId: 'f1e70322973dfede'},
          {valid: null, fingerprint: '2ce0 dbdc b17a ea6f 33b0 28c1 f1e7 0322 973d hs34'},
          {valid: true, fingerprint: '2ce0 dbdc b17a ea6f 33b0 28c1 f1e7 0322 973d 7fg2'},
          {valid: false, fingerprint: '2ce0 dbdc b17a ea6f 33b0 28c1 f1e7 0322 973d del5'}
        ]);
      });
    });
    it('should return decrypted message and signatures', () => {
      decryptStub.returns(Promise.resolve(
        {
          data: msg,
          file_name: '',
          format: ''
        }
      ));
      return decrypt({armored: '', format: 'binary'}).then(result => {
        expect(decryptStub.calledOnce).to.be.true;
        expect(result.data).to.equal(msg);
      });
    });
  });

  describe('encrypt', () => {
    let encryptStub;

    beforeEach(() => {
      encryptStub = sandbox.stub();
      GnupgRewireApi.__Rewire__('gpgme', {
        encrypt: encryptStub
      });
    });

    it('should return encrypted message (binary)', () => {
      const binaryMsg = window.btoa(msg);
      encryptStub.returns(Promise.resolve(
        {
          data: binaryMsg,
          format: 'base64'
        }
      ));
      return encrypt({data: '', dataURL: 'abc', encryptionKeyFprs: [], signingKeyFpr: [], armor: '', filename: ''}).then(result => {
        expect(encryptStub.calledOnce).to.be.true;
        expect(result).to.equal(msg);
      });
    });
    it('should return encrypted message', () => {
      encryptStub.returns(Promise.resolve(
        {
          data: msg,
          format: ''
        }
      ));
      return encrypt({data: '', dataURL: 'abc', encryptionKeyFprs: [], signingKeyFpr: [], armor: '', filename: ''}).then(result => {
        expect(encryptStub.calledOnce).to.be.true;
        expect(result).to.equal(msg);
      });
    });
    it('should throw an error', () => {
      encryptStub.throws({code:  'GNUPG_ERROR', message: 'Unusable public key'});
      return expect(encrypt({data: '', dataURL: 'abc', encryptionKeyFprs: [], signingKeyFpr: [], armor: '', filename: ''})).to.eventually.be.rejectedWith(mvelo.Error).and.have.property('message', 'gnupg_error_unusable_pub_key');
    });
  });
});
