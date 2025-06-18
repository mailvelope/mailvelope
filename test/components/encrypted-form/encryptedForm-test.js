import React from 'react';
import {render, screen, act, cleanup} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as l10n from 'lib/l10n';
import EncryptedForm from 'components/encrypted-form/encryptedForm';
import {createMockPort} from '../../__mocks__/port-factory';

// Mock FormSandbox
jest.mock('../../../src/components/encrypted-form/components/FormSandbox', () => require('../../__mocks__/components/encrypted-form/components/FormSandbox').default);

// Mock react-transition-group to avoid timer complexities
jest.mock('react-transition-group');

describe('Encrypt Form tests', () => {
  let mockPort;

  const setup = () => {
    mockPort = createMockPort();

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

  beforeAll(() => {
    l10n.mapToLocal();
  });

  afterEach(() => {
    // Clean up React Testing Library
    cleanup();
  });

  it('should render with loading state', async () => {
    const {container} = setup();
    // Check that the component renders
    expect(container).toBeTruthy();
    // The waiting modal should be present in the DOM
    expect(document.body.querySelector('.waiting-modal')).toBeInTheDocument();
    // Check for loading spinner and text using semantic queries
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    // Verify spinner is visible through the loading modal
    const spinnerInModal = document.body.querySelector('.waiting-modal .m-spinner-inline');
    expect(spinnerInModal).toBeInTheDocument();
  });

  describe('Integration tests', () => {
    it('should initialize the component and should wait on the form definition event', async () => {
      setup();

      expect(mockPort._events.on).toContain('encrypted-form-definition');
      expect(mockPort._events.on).toContain('error-message');
      expect(mockPort._events.on).toContain('terminate');
      expect(mockPort._events.on).toContain('encrypted-form-submit');
      expect(mockPort._events.on).toContain('encrypted-form-submit-cancel');
      expect(mockPort._events.emit).toContain('encrypted-form-init');
      expect(screen.getByText(/loading/i)).toBeInTheDocument(); // spinner loading text
    });

    it('should display form when form definition is provided', async () => {
      const {ref, container} = setup();
      const event = {
        formDefinition: '<form class="needs-validation" data-recipient="test@mailvelope.com"><input type="text" name="test" /></form>',
        formEncoding: 'html',
        formAction: null,
        formRecipient: 'test@mailvelope.com',
        recipientFpr: 'AA1E 0177 4BDF 7D76 A45B DC2D F11D B125 0C3C 3F1B'
      };

      await act(async () => {
        ref.current.showForm(event);
      });

      // Check that showWaiting state is changed
      expect(ref.current.state.showWaiting).toBe(false);

      // Manually set waiting to false to display the form
      await act(async () => {
        ref.current.setState({waiting: false});
      });

      // Check DOM elements are rendered
      expect(screen.getByRole('button', {name: /submit/i})).toBeInTheDocument();
      expect(screen.getByText(/recipient.*test@mailvelope.com/i)).toBeInTheDocument();
      expect(screen.getByText(/destination/i)).toBeInTheDocument();
      // Check fingerprint display (formatted with spaces)
      const fingerprintDiv = container.querySelector('.recipient-fingerprint');
      expect(fingerprintDiv).toBeInTheDocument();
      expect(fingerprintDiv.textContent).toMatch(/AA1E.*3F1.*B/);
      // Check form sandbox is rendered
      expect(screen.getByTestId('form-sandbox')).toBeInTheDocument();

      // Keep one state check for data integrity
      expect(ref.current.state.formRecipient).toBe(event.formRecipient);
    });

    it('should display error alert when error message is shown', async () => {
      const {ref} = setup();
      const error = {
        message: 'Error message!'
      };

      await act(async () => {
        ref.current.showErrorMsg(error);
      });

      // Check that showWaiting state is changed
      expect(ref.current.state.showWaiting).toBe(false);

      // Manually set waiting to false to display the error
      await act(async () => {
        ref.current.setState({waiting: false});
      });

      // Check error alert is displayed in DOM
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveClass('alert-danger');
      expect(alert).toHaveTextContent('Error message!');

      // Verify submit button is not shown when error is displayed
      expect(screen.queryByRole('button', {name: /submit/i})).not.toBeInTheDocument();
    });

    it('should handle component initialization correctly', async () => {
      const {ref} = setup();

      // Verify basic component setup
      expect(ref.current.state.waiting).toBe(true);
      expect(ref.current.state.terminate).toBe(false);
      expect(ref.current.port).toBeTruthy();
    });

    it('should handle form display with complete form data', async () => {
      const {ref} = setup();
      const formData = {
        formDefinition: '<form><input type="text" name="message" value="secret message" /></form>',
        formEncoding: 'html',
        formAction: 'https://example.com/submit',
        formRecipient: 'test@example.com',
        recipientFpr: 'AA1E 0177 4BDF 7D76 A45B DC2D F11D B125 0C3C 3F1B'
      };

      await act(async () => {
        ref.current.showForm(formData);
      });

      // Set waiting to false to display form
      await act(async () => {
        ref.current.setState({waiting: false});
      });

      // Now form should be displayed
      expect(screen.getByRole('button', {name: /submit/i})).toBeInTheDocument();

      // Check all form information is displayed
      expect(screen.getByText(/recipient.*test@example.com/i)).toBeInTheDocument();
      expect(screen.getByText(/destination.*https:\/\/example.com\/submit/i)).toBeInTheDocument();
      expect(screen.getByTestId('form-sandbox')).toBeInTheDocument();

      // Verify form encoding is properly stored
      expect(ref.current.state.formEncoding).toBe('html');
    });

    it('should handle different form encodings', async () => {
      const {ref} = setup();

      // Test URL encoding
      const urlEncodedForm = {
        formDefinition: 'message=Hello%20World&recipient=test%40example.com',
        formEncoding: 'url',
        formRecipient: 'test@example.com',
        recipientFpr: 'AA1E 0177 4BDF 7D76 A45B DC2D F11D B125 0C3C 3F1B'
      };

      await act(async () => {
        ref.current.showForm(urlEncodedForm);
      });

      // Set waiting to false to show form
      await act(async () => {
        ref.current.setState({waiting: false});
      });

      expect(screen.getByRole('button', {name: /submit/i})).toBeInTheDocument();

      // Check that form is displayed correctly
      expect(screen.getByTestId('form-sandbox')).toBeInTheDocument();
      expect(screen.getByText(/recipient.*test@example.com/i)).toBeInTheDocument();

      // Verify encoding is properly handled
      expect(ref.current.state.formEncoding).toBe('url');
    });

    it('should display and validate recipient fingerprint', async () => {
      const {ref, container} = setup();
      const formData = {
        formDefinition: '<form><input type="text" name="test" /></form>',
        formEncoding: 'html',
        formRecipient: 'test@example.com',
        recipientFpr: 'AA1E 0177 4BDF 7D76 A45B DC2D F11D B125 0C3C 3F1B'
      };

      await act(async () => {
        ref.current.showForm(formData);
      });

      // Set waiting to false to show form
      await act(async () => {
        ref.current.setState({waiting: false});
      });

      expect(screen.getByRole('button', {name: /submit/i})).toBeInTheDocument();

      // Check fingerprint is displayed in the UI
      const fingerprintDiv = container.querySelector('.recipient-fingerprint');
      expect(fingerprintDiv).toBeInTheDocument();
      expect(fingerprintDiv.textContent).toMatch(/AA1E.*3F1.*B/);

      // Verify fingerprint validity
      expect(ref.current.state.recipientFpr).toBeValidFingerprint();
    });

    it('should handle potentially malicious form content safely', async () => {
      const {ref} = setup();
      const formData = {
        formDefinition: '<form><script>alert("xss")</script><input type="text" name="test" /></form>',
        formEncoding: 'html',
        formRecipient: 'test@example.com',
        recipientFpr: 'AA1E 0177 4BDF 7D76 A45B DC2D F11D B125 0C3C 3F1B'
      };

      // Mock console.error to check for XSS attempts
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();

      await act(async () => {
        ref.current.showForm(formData);
      });

      // Set waiting to false to show form
      await act(async () => {
        ref.current.setState({waiting: false});
      });

      expect(screen.getByRole('button', {name: /submit/i})).toBeInTheDocument();

      // Verify no script execution occurred
      expect(alertSpy).not.toHaveBeenCalled();

      // Check form sandbox is rendered safely
      expect(screen.getByTestId('form-sandbox')).toBeInTheDocument();

      // The FormSandbox mock should handle the content safely
      expect(screen.getByText('Mocked Form Sandbox')).toBeInTheDocument();

      // Cleanup spies
      consoleErrorSpy.mockRestore();
      alertSpy.mockRestore();
    });
  });

  describe('User interaction tests', () => {
    it('should handle submit button click and trigger validation', async () => {
      const user = userEvent.setup();
      const {ref} = setup();

      // Show form first
      const formData = {
        formDefinition: '<form><input type="text" name=\"message\" required /></form>',
        formEncoding: 'html',
        formRecipient: 'test@example.com',
        recipientFpr: 'AA1E 0177 4BDF 7D76 A45B DC2D F11D B125 0C3C 3F1B'
      };

      await act(async () => {
        ref.current.showForm(formData);
      });

      // Set waiting to false to display form
      await act(async () => {
        ref.current.setState({waiting: false});
      });

      const submitButton = screen.getByRole('button', {name: /submit/i});
      expect(submitButton).toBeInTheDocument();

      // Click submit button
      await user.click(submitButton);

      // Verify validation state was triggered
      expect(ref.current.state.validate).toBe(true);
      expect(ref.current.state.validated).toBe(false);
    });

    it('should show spinner overlay when form is being submitted', async () => {
      const {ref, container} = setup();

      // Show form and simulate validation complete
      const formData = {
        formDefinition: '<form><input type=\"text\" name=\"message\" /></form>',
        formEncoding: 'html',
        formRecipient: 'test@example.com',
        recipientFpr: 'AA1E 0177 4BDF 7D76 A45B DC2D F11D B125 0C3C 3F1B'
      };

      await act(async () => {
        ref.current.showForm(formData);
      });

      // Simulate validated state
      await act(async () => {
        ref.current.onValidated({message: 'test data'});
      });

      // Check spinner wrapper is shown - need to set waiting false first
      await act(async () => {
        ref.current.setState({waiting: false});
      });

      // Now check for spinner wrapper
      const spinnerWrapper = container.querySelector('.spinnerWrapper');
      expect(spinnerWrapper).toBeInTheDocument();

      // Verify submit event was emitted
      expect(mockPort._events.emit).toContain('encrypted-form-submit');
    });

    it('should handle form submission cancellation', async () => {
      const {ref} = setup();

      // Setup form in validation state
      const formData = {
        formDefinition: '<form><input type=\"text\" name=\"message\" /></form>',
        formEncoding: 'html',
        formRecipient: 'test@example.com',
        recipientFpr: 'AA1E 0177 4BDF 7D76 A45B DC2D F11D B125 0C3C 3F1B'
      };

      await act(async () => {
        ref.current.showForm(formData);
        ref.current.setState({validate: true, validated: false});
      });

      // Trigger submission cancel
      await act(async () => {
        ref.current.onFormSubmitCancel();
      });

      // Verify state reset
      expect(ref.current.state.validate).toBe(false);
      expect(ref.current.state.validated).toBe(false);
    });

    it('should display loading state transitions correctly', async () => {
      const {ref} = setup();

      // Initially should show loading
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      expect(document.body.querySelector('.waiting-modal')).toBeInTheDocument();

      // Show form
      const formData = {
        formDefinition: '<form><input type=\"text\" name=\"test\" /></form>',
        formEncoding: 'html',
        formRecipient: 'test@example.com',
        recipientFpr: 'AA1E 0177 4BDF 7D76 A45B DC2D F11D B125 0C3C 3F1B'
      };

      await act(async () => {
        ref.current.showForm(formData);
      });

      // Set waiting to false to hide loading modal
      await act(async () => {
        ref.current.setState({waiting: false});
      });

      // Loading modal should not be present
      expect(document.body.querySelector('.waiting-modal')).not.toBeInTheDocument();

      // Form elements should be visible
      expect(screen.getByRole('button', {name: /submit/i})).toBeInTheDocument();
    });

    it('should properly handle error state transitions', async () => {
      const {ref} = setup();

      // Initially show form
      const formData = {
        formDefinition: '<form><input type=\"text\" name=\"test\" /></form>',
        formEncoding: 'html',
        formRecipient: 'test@example.com',
        recipientFpr: 'AA1E 0177 4BDF 7D76 A45B DC2D F11D B125 0C3C 3F1B'
      };

      await act(async () => {
        ref.current.showForm(formData);
      });

      // Set waiting false to show form
      await act(async () => {
        ref.current.setState({waiting: false});
      });

      // Verify form is shown
      expect(screen.getByRole('button', {name: /submit/i})).toBeInTheDocument();

      // Now show error
      await act(async () => {
        ref.current.showErrorMsg({message: 'Network error occurred'});
      });

      // Form should be hidden, error should be shown
      expect(screen.queryByRole('button', {name: /submit/i})).not.toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('Network error occurred');
    });
  });
});

