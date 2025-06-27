import {expect} from 'test';
import {deDup, checkEmail, parseViewName} from 'lib/util';

describe('lib/util unit tests', () => {
  describe('deDup', () => {
    it('should work for undefined', () => {
      expect(deDup()).to.deep.equal([]);
    });
    it('should work for empty array', () => {
      expect(deDup([])).to.deep.equal([]);
    });
    it('should work for unsorted array', () => {
      expect(deDup(['c', 'b', 'a', 'b'])).to.deep.equal(['c', 'b', 'a']);
    });
  });

  describe('checkEmail', () => {
    it('should be false for undefined', () => {
      expect(checkEmail()).to.be.false;
    });
    it('should be false empty string', () => {
      expect(checkEmail('')).to.be.false;
    });
    it('should be false special char at the beginning', () => {
      expect(checkEmail('>foo@bar.co')).to.be.false;
    });
    it('should be false special char at the end', () => {
      expect(checkEmail('foo@bar.co>')).to.be.false;
    });
    it('should be false no @', () => {
      expect(checkEmail('foobar.co')).to.be.false;
    });
    it('should be false no .', () => {
      expect(checkEmail('foo@barco')).to.be.false;
    });
    it('should be true fo valid email address', () => {
      expect(checkEmail('foo@bar.co')).to.be.true;
    });
  });

  describe('Parse view name', () => {
    it('Split at -', () => {
      const {type, id} = parseViewName('app-123');
      expect(type).to.equal('app');
      expect(id).to.equal('123');
    });

    it('Separator - required', () => {
      expect(parseViewName.bind(null, 'app')).to.throw('Invalid view name.');
    });

    it('Only one - separator allowed', () => {
      expect(parseViewName.bind(null, 'app-1-2')).to.throw('Invalid view name.');
    });
  });
});
