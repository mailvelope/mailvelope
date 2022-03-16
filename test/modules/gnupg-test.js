import {expect, sinon} from 'test';
import {decrypt, encrypt, __RewireAPI__ as GnupgRewireApi} from 'modules/gnupg';
import {MvError} from 'lib/util';

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

    it('should return decrypted message (binary) and signatures', async () => {
      const binaryMsg = window.btoa(msg);
      decryptStub.returns(Promise.resolve(
        {
          data: binaryMsg,
          signatures: {
            signatures: {
              good: [
                {
                  fingerprint: '2CE0DBDCB17AEA6F33B028C1F1E70322973DFEDE',
                  timestamp: new Date('10.10.2020')
                },
                {
                  fingerprint: 'F1E70322973DFEDE',
                  timestamp: new Date('11.10.2020')
                }
              ],
              bad: [
                {
                  fingerprint: '2CE0DBDCB17AEA6F33B028C1F1E70322973DHS34',
                  errorDetails: {
                    'key-missing': true
                  },
                },
                {
                  fingerprint: '2CE0DBDCB17AEA6F33B028C1F1E70322973D7FG2',
                  timestamp: new Date('12.10.2020'),
                  errorDetails: {
                    'key-missing': false,
                  },
                  _rawSigObject: {
                    status_code: 0,
                    validity: 3
                  }
                },
                {
                  fingerprint: '2CE0DBDCB17AEA6F33B028C1F1E70322973DDEL5',
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
      const result = await decrypt({armored: '', format: 'binary'});
      expect(decryptStub.calledOnce).to.be.true;
      const {data, signatures} = result;
      expect(data).to.equal(msg);
      expect(signatures).to.have.deep.members([
        {valid: true, fingerprint: '2ce0dbdcb17aea6f33b028c1f1e70322973dfede', created: new Date('10.10.2020')},
        {valid: true, keyId: 'f1e70322973dfede', created: new Date('11.10.2020')},
        {valid: null, fingerprint: '2ce0dbdcb17aea6f33b028c1f1e70322973dhs34'},
        {valid: true, fingerprint: '2ce0dbdcb17aea6f33b028c1f1e70322973d7fg2', created: new Date('12.10.2020')},
        {valid: false, fingerprint: '2ce0dbdcb17aea6f33b028c1f1e70322973ddel5'}
      ]);
    });
    it('should return decrypted message and signatures', async () => {
      decryptStub.returns(Promise.resolve(
        {
          data: msg,
          file_name: '',
          format: ''
        }
      ));
      const result = await decrypt({armored: '', format: 'binary'});
      expect(decryptStub.calledOnce).to.be.true;
      expect(result.data).to.equal(msg);
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

    it('should return encrypted message (binary)', async () => {
      const binaryMsg = window.btoa(msg);
      encryptStub.returns(Promise.resolve(
        {
          data: binaryMsg,
          format: 'base64'
        }
      ));
      const result = await encrypt({data: '', dataURL: 'abc', encryptionKeyFprs: [], signingKeyFpr: [], armor: '', filename: ''});
      expect(encryptStub.calledOnce).to.be.true;
      expect(result).to.equal(msg);
    });
    it('should return encrypted message', async () => {
      encryptStub.returns(Promise.resolve(
        {
          data: msg,
          format: ''
        }
      ));
      const result = await encrypt({data: '', dataURL: 'abc', encryptionKeyFprs: [], signingKeyFpr: [], armor: '', filename: ''});
      expect(encryptStub.calledOnce).to.be.true;
      expect(result).to.equal(msg);
    });
    it('should throw an error', () => {
      encryptStub.throws({code:  'GNUPG_ERROR', message: 'Unusable public key'});
      return expect(encrypt({data: '', dataURL: 'abc', encryptionKeyFprs: [], signingKeyFpr: [], armor: '', filename: ''})).to.eventually.be.rejectedWith(MvError).and.have.property('message', 'gnupg_error_unusable_pub_key');
    });
  });
});
