
import * as editor from '../../../src/components/editor/editor';
import '../../../src/lib/jquery.ext';

describe('Editor UI unit tests', () => {

  describe('checkEnvironment', () => {
    beforeEach(() => {
      sinon.stub($, 'parseQuerystring').returns({embedded: true, id: '12345'});
    });

    afterEach(() => {
      $.parseQuerystring.restore();
    });

    it('should work', () => {
      editor.checkEnvironment();
      expect(editor.embedded).to.be.true;
      expect(editor.id).to.equal('12345');
      expect(editor.name).to.equal('editor-12345');
    });
  });

});
