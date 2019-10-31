
import {expect, sinon} from 'test';
import EncryptFrame from 'content-scripts/encryptFrame';

describe('Encrypt Frame unit tests', () => {
  let ef;
  const recip = [{email: 'jon@smith.com'}];

  beforeEach(() => {
    ef = new EncryptFrame();
    ef.currentProvider = {
      getRecipients: () => Promise.resolve(recip),
      setRecipients: sinon.stub()
    };
  });

  afterEach(() => {});

  describe('getRecipients', () => {
    it('should work', () =>
      expect(ef.getRecipients()).to.eventually.include(...recip)
    );
  });

  describe('setEditorOutput', () => {
    beforeEach(() => {
      sinon.stub(ef, 'normalizeButtons');
      sinon.stub(ef, 'setMessage');
    });

    it('should work', () => {
      ef.setEditorOutput({to: recip});

      expect(ef.currentProvider.setRecipients.withArgs({recipients: recip, editElement: null}).calledOnce).to.be.true;
    });
  });
});
