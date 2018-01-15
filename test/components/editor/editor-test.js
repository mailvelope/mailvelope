
import Editor from '../../../src/components/editor/editor';

describe('Editor UI unit tests', () => {
  let editor;

  beforeEach(() => {
    editor = new Editor({id: 'abc'});
  });

  describe('onSetInitData', () => {
    beforeEach(() => {
      sinon.stub(editor, 'setState');
    });

    it('should work', () => {
      editor.onSetInitData({text: '123', signMsg: 'abc', primary: 'abc', privKeys: []});
      expect(editor.setState.withArgs({defaultPlainText: '123', signMsg: true, signKey: 'abc', primaryKey: true, privKeys: []}).calledOnce).to.be.true;
    });
  });
});
