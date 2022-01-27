import {expect, sinon} from 'test';
import * as analytics from 'lib/analytics';

describe.only('analytics tests', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe('measureWatchListHit', () => {
    beforeEach(() => {
      sandbox.spy(analytics.ci);      
    });
    
    it('should record hits to a bare domain matching defaults', () => {
      expect(analytics.ci.measureVisit.called).to.equal(false);
      analytics.measureWatchListHit('https://mail.google.com');
      expect(analytics.ci.measureVisit.called).to.equal(true);
    });
    it('should record hits to a subdomain matching defaults', () => {
      analytics.measureWatchListHit('https://sub.mail.google.com');
      expect(analytics.ci.measureVisit.called).to.equal(true);
    });
    it('should record hits to a path matching defaults', () => {
      analytics.measureWatchListHit('https://mail.google.com/some/path');
      expect(analytics.ci.measureVisit.called).to.equal(true);
    });
    it('should not record hits to a domain not in defaults', () => {
      analytics.measureWatchListHit('https://mail.notanalyzed.com');
      expect(analytics.ci.measureVisit.called).to.equal(false);
    });
    it('should only capture matched site and frame pattern', () => {
      analytics.measureWatchListHit('https://sub.gmx.net/some/path');
      const expected = [['GMX', '*.gmx.net'], 'provider'];
      expect(analytics.ci.measureVisit.calledWith(...expected)).to.equal(true);
    });
  });
});
