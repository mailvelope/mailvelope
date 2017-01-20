
import * as editor from '../../../src/components/editor/editor';

describe('Editor UI unit tests', () => {

  describe('checkEnvironment', () => {
    beforeEach(() => {
      $.parseQuerystring = $.parseQuerystring || function() {};
      sinon.stub($, 'parseQuerystring', () => ({ embedded: true, id: '12345'}));
    });

    afterEach(() => {
      $.parseQuerystring.restore();
    });

    it('should work', () => {
      expect(editor.embedded).to.not.exist;
      editor.checkEnvironment();
      expect(editor.embedded).to.be.true;
      expect(editor.id).to.equal('12345');
      expect(editor.name).to.equal('editor-12345');
    });
  });

});
