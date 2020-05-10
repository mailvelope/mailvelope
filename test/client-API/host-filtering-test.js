import {expect} from 'test';
import WatchList from 'app/settings/WatchList';

describe('WatchList Domain Validation', () => {
  describe('Valid domains', () => {
    it('accepts test.example', () =>
      expect(WatchList.validFrame('test.example')).to.be.true);

    it('accepts *.test.example', () =>
      expect(WatchList.validFrame('*.test.example')).to.be.true);

    it('accepts www.test.example:33', () =>
      expect(WatchList.validFrame('www.test.example:33')).to.be.true);

    it('accepts localhost:25', () =>
      expect(WatchList.validFrame('localhost:25')).to.be.true);

    it('accepts dbl--double--dash.es', () =>
      expect(WatchList.validFrame('dbl--double--dash.es')).to.be.true);
  });

  describe('Invalid filters', () => {
    it('rejects lacklhost', () =>
      expect(WatchList.validFrame('lacklhost')).to.be.false);

    it('rejects test.exampl.e', () =>
      expect(WatchList.validFrame('test.exampl.e')).to.be.false);

    it('rejects wow!.edu', () =>
      expect(WatchList.validFrame('wow!.edu')).to.be.false);

    it('rejects test*.com', () =>
      expect(WatchList.validFrame('test*.com')).to.be.false);

    it('rejects *.:80', () =>
      expect(WatchList.validFrame('*.:80')).to.be.false);
  });
});
