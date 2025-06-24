import WatchList from 'app/settings/WatchList';

describe('WatchList Domain Validation', () => {
  describe('Valid domains', () => {
    it('accepts test.example', () => {
      expect(WatchList.validFrame('test.example')).toBe(true);
    });

    it('accepts *.test.example', () => {
      expect(WatchList.validFrame('*.test.example')).toBe(true);
    });

    it('accepts www.test.example:33', () => {
      expect(WatchList.validFrame('www.test.example:33')).toBe(true);
    });

    it('accepts localhost:25', () => {
      expect(WatchList.validFrame('localhost:25')).toBe(true);
    });

    it('accepts dbl--double--dash.es', () => {
      expect(WatchList.validFrame('dbl--double--dash.es')).toBe(true);
    });
  });

  describe('Invalid filters', () => {
    it('rejects lacklhost', () => {
      expect(WatchList.validFrame('lacklhost')).toBe(false);
    });

    it('rejects test.exampl.e', () => {
      expect(WatchList.validFrame('test.exampl.e')).toBe(false);
    });

    it('rejects wow!.edu', () => {
      expect(WatchList.validFrame('wow!.edu')).toBe(false);
    });

    it('rejects test*.com', () => {
      expect(WatchList.validFrame('test*.com')).toBe(false);
    });

    it('rejects *.:80', () => {
      expect(WatchList.validFrame('*.:80')).toBe(false);
    });
  });
});
