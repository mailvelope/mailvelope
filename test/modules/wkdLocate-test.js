import {expect} from 'test';
import {buildWKDUrl} from 'modules/wkdLocate';

describe('WKD unit test', () => {
  describe('buildWKDUrl', () => {
    it('should generate a WKD URL', async () => {
      const wkdURL = await buildWKDUrl('demo@mailvelope.com');
      expect(wkdURL).to.equal('https://mailvelope.com/.well-known/openpgpkey/hu/t81jm3hwduh6edujodewwfi9ye6c4urt');
    });
  });
});
