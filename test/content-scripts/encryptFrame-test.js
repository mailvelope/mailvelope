
import EncryptFrame from '../../src/content-scripts/encryptFrame';


describe('Encrypt Frame unit tests', () => {

  var ef;
  var recip = [{email: 'jon@smith.com'}];

  beforeEach(() => {
    ef = new EncryptFrame();
    ef._currentProvider = {
      getRecipients: () => Promise.resolve([{email: 'jon@smith.com'}]),
      setRecipients: sinon.stub()
    };
  });

  afterEach(() => {});

  describe('_getRecipients', () => {
    beforeEach(() => {
      sinon.stub(ef, 'emit');
    });

    afterEach(() => {
      ef.emit.restore();
    });

    it('should work', () => ef._getRecipients()
    .then(() => {
      expect(ef.emit.withArgs('eframe-recipients', {recipients: recip}).calledOnce).to.be.true;
    }));
  });

  describe('_setEditorOutput', () => {
    beforeEach(() => {
      sinon.stub(ef, '_saveEmailText');
      sinon.stub(ef, '_normalizeButtons');
      sinon.stub(ef, '_setMessage');
    });

    it('should work', () => {
      ef._setEditorOutput({recipients: recip});

      expect(ef._currentProvider.setRecipients.withArgs({recipients: recip, editElement: null}).calledOnce).to.be.true;
    });
  });

});
