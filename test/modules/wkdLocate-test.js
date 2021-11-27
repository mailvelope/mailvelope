import {expect} from 'test';
import {buildWKDUrl} from 'modules/wkdLocate';

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
});
