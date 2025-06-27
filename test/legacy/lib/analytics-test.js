import {expect} from 'test';
import {binInto10sIncrements} from 'lib/analytics';

describe('analytics tests', () => {
  describe('time derezzing', () => {
    it('should derezz time to 10s increments', () => {
      expect(binInto10sIncrements(1000)).to.equal(0);
      expect(binInto10sIncrements(10000)).to.equal(10);
      expect(binInto10sIncrements(11111)).to.equal(10);
      expect(binInto10sIncrements(99999)).to.equal(90);
    });
  });
});
