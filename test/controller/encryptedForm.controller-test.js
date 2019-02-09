import {expect, sinon} from 'test';
import {Port} from 'utils';
import EncryptedFormController from 'controller/encryptedForm.controller';

describe('EncryptForm controller unit tests', () => {
  const sandbox = sinon.createSandbox();
  let ctrl;
  let port;
  let formElement;

  beforeEach(() => {
    port = new Port('encryptedFormCont-1');
    ctrl = new EncryptedFormController(port);
    formElement = {getAttribute: sandbox.stub()};
  });

  afterEach(() => {
    sandbox.restore();
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  describe('getCleanFormHtml', () => {
    it('should not sanitize allowed tags', () => {
      const allowed = [
        'bdi', 'bdo', 'br', 'datalist', 'div', 'fieldset', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'i',
        'input', 'label', 'legend', 'optgroup', 'option', 'p', 'select', 'small', 'span', 'strong', 'textarea'
      ];
      allowed.forEach(tag => {
        const html = `<${tag}>test</${tag}>`;
        expect(ctrl.getCleanFormHtml(html)).to.contain(tag);
      });
    });

    it('should not sanitize allowed attributes', () => {
      const allowed = [
        'accesskey', 'class', 'dir', 'hidden', 'id', 'lang', 'tabindex', 'title', 'name', 'alt',
        'checked', 'dirname', 'disabled', 'for', 'required', 'list', 'max', 'maxlength', 'min', 'multiple',
        'name', 'pattern', 'placeholder', 'readonly', 'required', 'size', 'step', 'type', 'value',
        'data-action', 'data-recipient'
      ];
      allowed.forEach(attr => {
        const html = `<input ${attr}="_blank"/>`;
        expect(ctrl.getCleanFormHtml(html)).to.contain(attr);
      });
    });

    it('should sanitize forbiden attributes', () => {
      const forbid = [
        'width', 'usemap', 'slot', 'spellcheck', 'novalidate', 'method',
        'integrity', 'href', 'formaction', 'download', 'data-something', 'contenteditable', 'codebase',
        'charset', 'async', 'accept',
        // event handlers
        'onclick', 'onblur', 'onload', 'data-custom'
      ];
      forbid.forEach(attr => {
        const html = `<input ${attr}="_blank"/>`;
        expect(ctrl.getCleanFormHtml(html)).to.not.contain(attr);
      });
    });

    it('should sanitize forbidden tags', () => {
      const forbid = [
        'script', 'style', 'object', 'a', 'audio', 'base', 'embed', 'iframe', 'link',
        'param', 'source', 'var', 'video', 'title'
      ];
      forbid.forEach(tag => {
        const html = `<${tag}>nope</${tag}>`;
        expect(ctrl.getCleanFormHtml(html)).to.not.contain(tag);
      });
    });
  });

  describe('getCleanFormElement', () => {
    it('should throw an exception if no form tag is present', () => {
      const fails = ['<p>there is no spoon</p>', 'no spoon'];
      fails.forEach(dirtyHtml => {
        expect(ctrl.getCleanFormElement.bind(ctrl, dirtyHtml)).throws()
        .and.have.property('code', 'NO_FORM');
      });
    });

    it('should throw an exception if too many form tags are present', () => {
      const fails = ['<form></form><form></form>', '<form></form><form>'];
      fails.forEach(dirtyHtml => {
        expect(ctrl.getCleanFormElement.bind(ctrl, dirtyHtml)).throws()
        .and.have.property('code', 'TOO_MANY_FORMS');
      });
    });

    it('should return a purified form tag', () => {
      const action = 'https://demo.mailvelope.com';
      const recipient = 'thomas@mailvelope.com';
      const enctype = 'html';
      const success = `<form data-action="${action}" data-enctype="${enctype}" data-recipient="${recipient}" data-no="no" onclick="alert('coucou');"></form>`;
      const element = ctrl.getCleanFormElement(success);
      expect(element).to.be.an.instanceof(HTMLElement);
      expect(element.getAttribute('data-action')).to.equal(action);
      expect(element.getAttribute('data-recipient')).to.equal(recipient);
      expect(element.getAttribute('data-enctype')).to.equal(enctype);
      expect(element.getAttribute('data-no')).to.be.null;
      expect(element.getAttribute('onclick')).to.be.null;
    });
  });

  describe('assertAndSetAction', () => {
    it('should throw an error if data-action property is not a valid url', () => {
      const fails = ['not_an_url', 'something://not_url'];
      fails.forEach(action => {
        formElement.getAttribute.returns(action);
        expect(ctrl.assertAndSetAction.bind(ctrl, formElement)).throws()
        .and.have.property('code', 'INVALID_FORM_ACTION');
      });
    });

    it('should set formAction if the url is valid', () => {
      const success = ['https://demo.mailvelope.com', 'https://192.168.1.23'];
      success.forEach(action => {
        formElement.getAttribute.returns(action);
        expect(ctrl.assertAndSetAction(formElement)).to.be.true;
        expect(ctrl.formAction).to.equal(action);
      });
    });
  });

  describe('assertAndSetRecipient', () => {
    it('should throw an error if data-recipient is empty', () => {
      formElement.getAttribute.returns(undefined);
      expect(ctrl.assertAndSetRecipient.bind(ctrl, formElement)).throws()
      .and.have.property('code', 'RECIPIENT_EMPTY');
    });

    it('should throw an error if data-recipient is not a valid email', () => {
      const fails = ['not_an_email', 'not@email'];
      fails.forEach(email => {
        formElement.getAttribute.returns(email);
        expect(ctrl.assertAndSetRecipient.bind(ctrl, formElement)).throws()
        .and.have.property('code', 'RECIPIENT_INVALID_EMAIL');
      });
    });

    it('should set formRecipient if the email is valid', () => {
      const success = ['thomas@mailvelope.com'];
      success.forEach(email => {
        formElement.getAttribute.returns(email);
        expect(ctrl.assertAndSetRecipient(formElement)).to.be.true;
        expect(ctrl.formRecipientEmail).to.equal(email);
      });
    });
  });

  describe('assertAndSetEncoding', () => {
    it('should set enctype to url if data-enctype empty', () => {
      formElement.getAttribute.returns(undefined);
      expect(ctrl.assertAndSetEncoding(formElement)).to.be.true;
      expect(ctrl.formEncoding).to.equal('url');
    });

    it('should set throw an error if data-enctype is not supported', () => {
      const fails = ['unsuported', '漢字'];
      fails.forEach(enctype => {
        formElement.getAttribute.returns(enctype);
        expect(ctrl.assertAndSetEncoding.bind(ctrl, formElement)).throws()
        .and.have.property('code', 'UNSUPPORTED_ENCTYPE');
      });
    });

    it('should set file extension to txt if data-enctype is url', () => {
      formElement.getAttribute.returns('url');
      expect(ctrl.assertAndSetEncoding(formElement)).to.be.true;
      expect(ctrl.formEncoding).to.equal('url');
      expect(ctrl.fileExtension).to.equal('txt');
    });

    it('should set file extension and encoding to json if data-enctype is equal to json', () => {
      formElement.getAttribute.returns('json');
      expect(ctrl.assertAndSetEncoding(formElement)).to.be.true;
      expect(ctrl.formEncoding).to.equal('json');
      expect(ctrl.fileExtension).to.equal('json');
    });

    it('should set file extension and encoding to html if data-enctype is equal to html', () => {
      formElement.getAttribute.returns('html');
      expect(ctrl.assertAndSetEncoding(formElement)).to.be.true;
      expect(ctrl.formEncoding).to.equal('html');
      expect(ctrl.fileExtension).to.equal('html');
    });
  });

  describe('assertAndSetSignature', () => {
    it('should throw and error if signature is empty', () => {
      expect(ctrl.assertAndSetSignature.bind(ctrl)).throws()
      .and.have.property('code', 'NO_SIGNATURE');
    });

    it('should set formSignature if signature in valid format', () => {
      const sig = 'wpwEAQEIABAFAlsfZhgJEPEdsSUMPD8bAABx4QQAmL3LkE1z0jHYxghB0lH9ee15D93FrrWfpvJwLVlIq1iCANH+15nm2KTmF559KNFy8dER5+s044ZsTuSKBmf5FgzrdbAYG1KSup/NnZ2TNMFOKLb5Bc7tLyopD+n5NQ/ctnVuX0v1NMmH5FhKP88j/07kt3hk2s8OWI0NqMHeNZs==3HOs';
      expect(ctrl.assertAndSetSignature(sig)).to.be.true;
      expect(ctrl.formSignature).to.equal(sig);
    });
  });

  describe('signAndEncrypt', () => {
    let keyRingMock;

    beforeEach(() => {
      keyRingMock = {getDefaultKeyFpr: sandbox.stub()};
      const getKeyringByIdStub = sandbox.stub().returns(keyRingMock);
      EncryptedFormController.__Rewire__('getKeyringById', getKeyringByIdStub);
    });

    it('should throw an error if no default key is found', () => {
      keyRingMock.getDefaultKeyFpr.returns(null);
      ctrl.keyringId = 'nope';
      return expect(ctrl.signAndEncrypt('test')).to.eventually.be.rejectedWith().and.have.property('code', 'NO_DEFAULT_KEY_FOUND');
    });
  });
});
