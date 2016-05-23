/* global mvelo */

'use strict';

describe('Encrypt Frame unit tests', function() {

  var ef, recip = [{email: 'jon@smith.com'}];

  beforeEach(function() {
    ef = new mvelo.EncryptFrame();
    mvelo.main = mvelo.main || {};
    mvelo.main.currentProvider = {
      getRecipients: function() { return [{email: 'jon@smith.com'}]; },
      setRecipients: sinon.stub()
    };
  });

  afterEach(function() {});

  describe('_getRecipients', function() {
    beforeEach(function() {
      sinon.stub(ef, 'emit');
    });

    afterEach(function() {
      ef.emit.restore();
    });

    it('should work', function() {
      ef._getRecipients();

      expect(ef.emit.withArgs('eframe-recipients', {recipients:recip}).calledOnce).to.be.true;
    });
  });

  describe('_setEditorOutput', function() {
    beforeEach(function() {
      sinon.stub(ef, '_saveEmailText');
      sinon.stub(ef, '_normalizeButtons');
      sinon.stub(ef, '_setMessage');
    });

    it('should work', function() {
      ef._setEditorOutput({recipients:recip});

      expect(mvelo.main.currentProvider.setRecipients.withArgs(recip).calledOnce).to.be.true;
    });
  });

});
