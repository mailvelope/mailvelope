import React from 'react';
import {render, screen, waitFor, expect, sinon, act} from 'test';
import * as l10n from 'lib/l10n';
import {createMockPort} from '../../utils';
import EncryptedForm from 'components/encrypted-form/encryptedForm';

l10n.mapToLocal();

describe('Encrypt Form tests', () => {
  const sandbox = sinon.createSandbox();

  const setup = () => {
    const props = {
      id: 'encrypted-form-test'
    };

    const ref = React.createRef();
    const rtlUtils = render(<EncryptedForm ref={ref} {...props} />);

    return {
      ref,
      ...rtlUtils,
    };
  };

  beforeEach(() => {
    createMockPort(sandbox);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should render', async () => {
    const {container} = setup();
    // Check that the render completed successfully
    // The modal might be rendered in a portal outside the container
    await waitFor(() => {
      // Check that something was rendered
      expect(container).to.exist;
      // The modal is likely in a portal, so just verify the component structure exists
      expect(document.body.querySelector('.modal')).to.exist;
    });
  });

  describe('Do some integration tests', () => {
    it('should initialize the component and should wait on the form definition event', async () => {
      const {ref} = setup();

      expect(ref.current.port._events.on).to.include('encrypted-form-definition');
      expect(ref.current.port._events.on).to.include('error-message');
      expect(ref.current.port._events.on).to.include('terminate');
      expect(ref.current.port._events.on).to.include('encrypted-form-submit');
      expect(ref.current.port._events.on).to.include('encrypted-form-submit-cancel');
      expect(ref.current.port._events.emit).to.include('encrypted-form-init');
      expect(screen.getByRole('status')).to.exist; // spinner
    });

    it('should show the sandbox form component and the form materials', async () => {
      const {container, ref} = setup();
      const event = {
        formDefinition: '<form class="needs-validation" data-recipient="test@mailvelope.com" data-action="https://demo.mailvelope.com/form/"><div class="form-group"><label for="validationCustomSimple">How are you?</label><div class="input-group"><input class="form-control" value="cofveve" name="validationCustomSimple" required="" type="text" id="validationCustomSimple"><div class="invalid-feedback">Please say something?</div></div></div></form>',
        formEncoding: 'html',
        formAction: null,
        formRecipient: 'test@mailvelope.com',
        recipientFpr: 'AA1E 0177 4BDF 7D76 A45B DC2D F11D B125 0C3C 3F1B'
      };

      await act(async () => {
        ref.current.showForm(event);
      });

      await waitFor(() => {
        const formSandbox = container.querySelector('#formSandbox');
        expect(formSandbox).to.exist;
        const formWrapper = container.querySelector('.formWrapper');
        expect(formWrapper).to.exist;
        expect(screen.getByRole('button')).to.exist;
      });
    });

    it('should show error message on error-message event', async () => {
      const {container, ref} = setup();
      const error = {
        message: 'Error message!'
      };

      await act(async () => {
        ref.current.showErrorMsg(error);
      });

      await waitFor(() => {
        const alert = container.querySelector('.alert');
        expect(alert).to.exist;
        expect(alert.textContent).to.include(error.message);
      });
    });
  });
});
