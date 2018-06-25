import {Port} from '../util';
import EncryptedFormController from "../../src/controller/encryptedForm.controller";
import mvelo from "../../src/lib/lib-mvelo";

describe('Test controller unit tests', () => {
  let ctrl;
  let port;
  const formElement = {getAttribute: sinon.stub()};

  beforeEach(() => {
    port = new Port('encryptedFormCont');
    ctrl = new EncryptedFormController(port);
  });

  afterEach(() => {
    // cleanup
  });

  describe('getCleanFormElement', () => {
    it('should throw an exception if no form tag is present', () => {
      const fails = [`<p>there is no spoon</p>`, 'no spoon'];
      fails.forEach(dirtyHtml => {
        expect(ctrl.getCleanFormElement.bind(ctrl, dirtyHtml)).throws()
          .and.have.property('code', 'NO_FORM');
      });
    });

    it('should throw an exception if too many form tags are present', () => {
      const fails = [`<form></form><form></form>`,`<form></form><form>`];
      fails.forEach(dirtyHtml => {
        expect(ctrl.getCleanFormElement.bind(ctrl, dirtyHtml)).throws()
          .and.have.property('code', 'TOO_MANY_FORMS');
      });
    });

    it('should return a purified form tag', () => {
      let success = `<form data-action="https://valid.com" data-nope="no"></form>`;
      let element = ctrl.getCleanFormElement(success);
      expect(element).to.be.an.instanceof(HTMLElement);
      let attribute = element.getAttribute('data-action');
      expect(attribute).to.equal('https://valid.com');
    });
  });

  describe('assertAndSetAction', () => {
    it('should throw an error if data-action property is not a valid or secure url', () => {
      const fails = ['not_an_url', 'something://not_url', 'http://notsecure.com'];
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
        expect(ctrl.formRecipient).to.equal(email);
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

    it('should set formSignature if signature valid', () => {
      const sig = 'wpwEAQEIABAFAlsfZhgJEPEdsSUMPD8bAABx4QQAmL3LkE1z0jHYxghB0lH9ee15D93FrrWfpvJwLVlIq1iCANH+15nm2KTmF559KNFy8dER5+s044ZsTuSKBmf5FgzrdbAYG1KSup/NnZ2TNMFOKLb5Bc7tLyopD+n5NQ/ctnVuX0v1NMmH5FhKP88j/07kt3hk2s8OWI0NqMHeNZs==3HOs';
      expect(ctrl.assertAndSetSignature(sig)).to.be.true;
      expect(ctrl.formSignature).to.equal(sig);
    });
  });
});
