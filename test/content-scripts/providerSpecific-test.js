import {expect} from 'test';
import * as providers from 'content-scripts/providerSpecific';

describe('Provider specific content-script unit tests', () => {
  let testElem;

  beforeEach(() => {
    testElem = $('<div id="testElem"></div>');
    $(document.body).append(testElem);
  });

  afterEach(() => {
    testElem.remove();
  });

  describe('providers.init', () => {
    it('should work', () => {
      providers.init({provider: {gmail_integration: false}});
    });
  });

  describe('providers.get', () => {
    beforeEach(() => {
      providers.init({provider: {gmail_integration: false}});
    });

    it('should return default module for generic case', () => {
      const api = providers.get('mail.some-generic-provider.com');
      expect(api.constructor.name === 'Default').to.be.true;
    });

    it('should return Gmail module', () => {
      const api = providers.get('mail.google.com');
      expect(api.constructor.name === 'Gmail').to.be.true;
    });
  });

  describe('Default module', () => {
    let defMod;

    beforeEach(() => {
      providers.init({provider: {gmail_integration: false}});
      defMod = providers.get('mail.some-generic-provider.com');
    });

    describe('getRecipients', () => {
      it('should work', () => {
        defMod.getRecipients();
      });

      it('should work for undefined', async () => {
        defMod.setRecipients({});
        const recipients = await defMod.getRecipients();
        expect(recipients.length).to.equal(0);
      });
    });

    describe('setRecipients', () => {
      it('should work', () => {
        defMod.setRecipients();
      });
    });

    describe('getSender', () => {
      it('should work', () =>
        expect(defMod.getSender()).to.eventually.deep.equal([])
      );
    });
  });

  describe('Gmail module', () => {
    let gmail;

    beforeEach(() => {
      providers.init({provider: {gmail_integration: false}});
      gmail = providers.get('mail.google.com');
      const container = $('<div class="I5"></div>');
      testElem.wrap(container);
    });

    describe('getRecipients', () => {
      it('should work', async () => {
        testElem.append('<div class="agb"><div class="afV" data-hovercard-id="test1@example.com"></div></div>');
        testElem.append('<div class="agb"><div class="afV" data-hovercard-id="test2@example.com"></div></div>');

        const recipients = await gmail.getRecipients(testElem[0]);
        expect(recipients.length).to.equal(2);
        expect(recipients[0].email).to.equal('test1@example.com');
        expect(recipients[1].email).to.equal('test2@example.com');
      });

      it('should work for long TLD', async () => {
        testElem.append('<div class="agb"><div class="afV" data-hovercard-id="test1@example.software"></div></div>');

        const recipients = await gmail.getRecipients(testElem[0]);
        expect(recipients.length).to.equal(1);
        expect(recipients[0].email).to.equal('test1@example.software');
      });
    });

    describe('setRecipients', () => {
      beforeEach(() => {
        testElem.append('<div class="afV" data-hovercard-id="test1@example.com" data-name="Test 1"><div class="afW"><div class="af6"><div class="afX"></div></div></div></div>');
        testElem.append('<div class="afV" data-hovercard-id="test2@example.com" data-name="Test 2"><div class="afW"><div class="af6"><div class="afX"></div></div></div></div>');
        testElem.append('<div class="agP aFw"></div>');
      });

      it('should trigger click event on email remove buttons', done => {
        const toSet = [{name: 'Test 1', email: 'test1@example.com'}, {name: 'Test 2', email: 'test2@example.com'}];

        $('.afV[data-hovercard-id] .afX').on('click', () => {
          done();
        });

        gmail.setRecipients({recipients: toSet, editElement: testElem[0]});
      });

      it('should set joined email addresses to input field', done => {
        const toSet = [{name: 'Test 1', email: 'test1@example.com'}, {name: 'Test 2', email: 'test2@example.com'}];

        gmail.setRecipients({recipients: toSet, editElement: testElem[0]});

        setTimeout(() => {
          expect($('.agP.aFw').val()).to.equal('test1@example.com, test2@example.com');
          done();
        }, 10);
      });

      it('should work for undefined', async () => {
        gmail.setRecipients({editElement: testElem[0]});
        const recipients = await gmail.getRecipients(testElem[0]);
        expect(recipients.length).to.equal(0);
      });

      it('should not inject script', async () => {
        const toSet = [{email: '<script>alert("xss")</script>'}];

        gmail.setRecipients({recipients: toSet, editElement: testElem[0]});
        const recipients = await gmail.getRecipients(testElem[0]);
        expect(recipients.length).to.equal(0);
      });
    });
  });
});
