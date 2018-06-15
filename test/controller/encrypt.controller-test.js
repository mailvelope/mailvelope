
import mvelo from '../../src/lib/lib-mvelo';
import * as sub from '../../src/controller/sub.controller';
import * as prefs from '../../src/modules/prefs';
import EncryptController from '../../src/controller/encrypt.controller';

let ctrl;
let editorCtrlMock;
const preferences = Object.assign({}, prefs.prefs);

const testRecipients = [{email: 'test@example.com'}];

describe('Encrypt controller unit tests', () => {
  beforeEach(() => {
    ctrl = new EncryptController();

    editorCtrlMock = {
      encrypt: sinon.stub()
    };
    sinon.stub(sub.factory, 'get').returns(editorCtrlMock);
    Object.assign(prefs.prefs, preferences);
    sinon.stub(mvelo.util, 'sanitizeHTML').returns('parsed');
    sinon.stub(ctrl, 'emit');
  });

  afterEach(() => {
    sub.factory.get.restore();
    mvelo.util.sanitizeHTML.restore();
    ctrl.emit.restore();
  });

  describe('Check event handlers', () => {
    it('should handle recipients', () => {
      expect(ctrl._handlers.get('eframe-recipients')).to.exist;
      expect(ctrl._handlers.get('eframe-display-editor')).to.exist;
    });
  });

  describe('openEditor', () => {
    it('should work for editor type plain', () => {
      editorCtrlMock.encrypt.returns(Promise.resolve({armored: 'armored', recipients: testRecipients}));
      prefs.prefs.general = {
        editor_type: 'plain'
      };

      return ctrl.openEditor({text: 'foo'})
      .then(() => {
        expect(ctrl.emit.withArgs('set-editor-output', {text: 'armored', recipients: testRecipients}).calledOnce).to.be.true;
      });
    });

    it('should stop on error', () => {
      editorCtrlMock.encrypt.returns(Promise.reject(new Error('foo')));
      return ctrl.openEditor({text: 'foo'})
      .then(() => {
        expect(ctrl.emit.called).to.be.false;
      });
    });
  });

  describe('getRecipientProposal', () => {
    const callback = function() {};

    it('should work', () => {
      ctrl.getRecipientProposal(callback);
      expect(ctrl.emit.withArgs('get-recipients').calledOnce).to.be.true;
      expect(ctrl.recipientsCallback).to.equal(callback);
    });

    it('should fail', () => {
      ctrl.recipientsCallback = function() {};
      expect(ctrl.getRecipientProposal.bind(ctrl, callback)).to.throw(/Waiting/);
      expect(ctrl.emit.called).to.be.false;
      expect(ctrl.recipientsCallback).to.not.equal(callback);
    });
  });

  describe('displayRecipientProposal', () => {
    let recipientsCallbackStub;

    beforeEach(() => {
      recipientsCallbackStub = ctrl.recipientsCallback = sinon.stub();
    });

    it('should callback', () => {
      ctrl.displayRecipientProposal({recipients: testRecipients});

      expect(ctrl.recipientsCallback).to.be.null;
      expect(recipientsCallbackStub.withArgs(testRecipients).calledOnce).to.be.true;
    });

    it('should not callback', () => {
      ctrl.recipientsCallback = null;

      ctrl.displayRecipientProposal({recipients: testRecipients});

      expect(ctrl.recipientsCallback).to.be.null;
      expect(recipientsCallbackStub.called).to.be.false;
    });
  });
});
