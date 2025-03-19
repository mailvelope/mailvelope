import {expect} from 'test';
import {buildWKDUrl, isBlocklisted} from 'modules/wkdLocate';

describe('WKD unit test', () => {
  describe('Direct Method', () => {
    it('should generate a WKD URL', async () => {
      const wkdURL = await buildWKDUrl('demo@mailvelope.com', 'direct');
      expect(wkdURL).to.equal('https://mailvelope.com/.well-known/openpgpkey/hu/t81jm3hwduh6edujodewwfi9ye6c4urt?l=demo');
    });
  });
  describe('Advanced Method', () => {
    it('should generate a WKD URL', async () => {
      const wkdURL = await buildWKDUrl('demo@mailvelope.com', 'advanced');
      expect(wkdURL).to.equal('https://openpgpkey.mailvelope.com/.well-known/openpgpkey/mailvelope.com/hu/t81jm3hwduh6edujodewwfi9ye6c4urt?l=demo');
    });
  });
  describe('Blocklist', () => {
    describe('is blocked', () => {
      it('gmail.com', () => expect(isBlocklisted('gmail.com')).to.be.true);
      it('googlemail.com', () => expect(isBlocklisted('googlemail.com')).to.be.true);
      it('gmx.com', () => expect(isBlocklisted('gmx.com')).to.be.true);
      it('gmx.de', () => expect(isBlocklisted('gmx.de')).to.be.true);
      it('outlook.com', () => expect(isBlocklisted('outlook.com')).to.be.true);
      it('hotmail.com', () => expect(isBlocklisted('hotmail.com')).to.be.true);
      it('web.de', () => expect(isBlocklisted('web.de')).to.be.true);
      it('yahoo.com', () => expect(isBlocklisted('yahoo.com')).to.be.true);
      it('yahoo.de', () => expect(isBlocklisted('yahoo.de')).to.be.true);
    });
    describe('is not blocked', () => {
      it('mailvelope.com', () => expect(isBlocklisted('mailvelope.com')).to.be.false);
      it('gmail.malicious.com', () => expect(isBlocklisted('gmail.malicious.com')).to.be.false);
      it('gmx.world', () => expect(isBlocklisted('gmx.world')).to.be.false);
      it('outlook.de', () => expect(isBlocklisted('outlook.de')).to.be.false);
      it('webex.de', () => expect(isBlocklisted('webex.de')).to.be.false);
      it('myyahoo.com', () => expect(isBlocklisted('myyahoo.com')).to.be.false);
    });
  });
});
