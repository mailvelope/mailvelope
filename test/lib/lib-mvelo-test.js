import {expect} from 'test';
import mvelo from 'lib/lib-mvelo';

describe('lib-mvelo unit tests', () => {
  describe('text2autoLinkHtml', () => {
    it('should auto link simple domain', () => {
      expect(mvelo.util.text2autoLinkHtml('mailvelope.com')).to.equal('<a href="https://mailvelope.com" target="_blank" rel="noreferrer noopener">mailvelope.com</a>');
    });
    it('should auto link domain with query', () => {
      expect(mvelo.util.text2autoLinkHtml('www.mailvelope.com/?key=value')).to.equal('<a href="https://www.mailvelope.com/?key=value" target="_blank" rel="noreferrer noopener">www.mailvelope.com/?key=value</a>');
    });
    it('should auto link domain with port', () => {
      expect(mvelo.util.text2autoLinkHtml('www.mailvelope.com:8000')).to.equal('<a href="https://www.mailvelope.com:8000" target="_blank" rel="noreferrer noopener">www.mailvelope.com:8000</a>');
    });
    it('should auto link URL with scheme', () => {
      expect(mvelo.util.text2autoLinkHtml('http://www.mailvelope.com')).to.equal('<a href="http://www.mailvelope.com" target="_blank" rel="noreferrer noopener">http://www.mailvelope.com</a>');
    });
    it('should auto link email address', () => {
      expect(mvelo.util.text2autoLinkHtml('info@mailvelope.com')).to.equal('<a href="mailto:info@mailvelope.com" target="_blank" rel="noreferrer noopener">info@mailvelope.com</a>');
    });
    it('should auto link mixed case URL', () => {
      expect(mvelo.util.text2autoLinkHtml('mailvelope.com/keyring?id=pS-gbqbVd8c')).to.equal('<a href="https://mailvelope.com/keyring?id=pS-gbqbVd8c" target="_blank" rel="noreferrer noopener">mailvelope.com/keyring?id=pS-gbqbVd8c</a>');
    });
    it('should auto link URL in parenthesis', () => {
      expect(mvelo.util.text2autoLinkHtml('(www.mailvelope.com)')).to.equal('(<a href="https://www.mailvelope.com" target="_blank" rel="noreferrer noopener">www.mailvelope.com</a>)');
    });
    it('should auto link URL with non English letters', () => {
      expect(mvelo.util.text2autoLinkHtml('https://test.mailvelope.com/user/მთავარი_გვერდი')).to.equal('<a href="https://test.mailvelope.com/user/მთავარი_გვერდი" target="_blank" rel="noreferrer noopener">https://test.mailvelope.com/user/მთავარი_გვერდი</a>');
    });
    it('should escape special chars', () => {
      expect(mvelo.util.text2autoLinkHtml('&<>')).to.equal('&amp;&lt;&gt;');
    });
  });
});
