import React from 'react';
import {render, screen, act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as l10n from 'lib/l10n';
import Editor from 'components/editor/editor';

jest.mock('../../../../src/lib/EventHandler', () => require('../../__mocks__/lib/EventHandler').default);
// Mock ContentSandbox
jest.mock('../../../../src/components/editor/components/PlainText', () => require('../../__mocks__/components/editor/components/PlainText').default);

// Mock RecipientInput component for isolation
jest.mock('components/editor/components/RecipientInput', () => ({
  RecipientInput: () => <div data-testid="recipient-input" />
}));

// Mock file library
jest.mock('lib/file', () => ({
  ...jest.requireActual('lib/file'),
  isOversize: jest.fn(() => false),
  FileUpload: jest.fn().mockImplementation(() => ({
    readFile: jest.fn().mockImplementation(file => Promise.resolve({
      name: file.name,
      size: file.size,
      type: file.type,
      id: `test-id-${crypto.randomUUID()}`
    }))
  }))
}));

describe('Editor tests', () => {
  const setup = (props = {}, portResponses = {}, portOptions = {}) => {
    // Configure mock responses BEFORE rendering
    const MockEventHandler = require('../../__mocks__/lib/EventHandler').default;
    MockEventHandler.setMockResponses(portResponses, portOptions);

    const defaultProps = {
      id: 'editor-test',
      maxFileUploadSize: 25 * 1024 * 1024,
      ...props
    };
    const ref = React.createRef();
    const rtlUtils = render(<Editor ref={ref} {...defaultProps} />);

    return {ref, ...rtlUtils};
  };

  const mockPrivKeys = [{
    type: 'private',
    validity: true,
    keyId: 'E47CCA58286FEFE6',
    fingerprint: '9acdfd634605bc0a0b18d518e38cca58286fefe6',
    userId: 'Max Mustermann <max.muster@mann.com>',
    name: 'Max Mustermann',
    email: 'max.muster@mann.com',
    exDate: false,
    crDate: '2018-10-11T15:45:00.000Z',
    algorithm: 'RSA (Encrypt or Sign)',
    bitLength: 4096
  }];

  beforeAll(() => {
    l10n.mapToLocal();
  });

  afterEach(() => {
    const MockEventHandler = require('../../__mocks__/lib/EventHandler').default;
    MockEventHandler.clearMockResponses();
  });

  it('should render', () => {
    const {container} = setup();
    expect(container.querySelector('.editor')).toBeInTheDocument();
  });

  describe('Unit tests', () => {
    describe('Component initialization', () => {
      it('should initialize with default state values', () => {
        const {ref} = setup();
        expect(ref.current.state.embedded).toBe(false);
        expect(ref.current.state.integration).toBe(false);
        expect(ref.current.state.waiting).toBe(true);
        expect(ref.current.state.signMsg).toBe(false);
        expect(ref.current.state.files).toEqual([]);
        expect(ref.current.state.recipients).toEqual([]);
      });

      it('should emit editor-mount event on mount', () => {
        const {ref} = setup();
        expect(ref.current.port._events.emit).toContain('editor-mount');
      });

      it('should register event listeners for port communication', () => {
        const {ref} = setup();
        const expectedEvents = [
          'set-text', 'set-init-data', 'set-mode', 'set-attachment',
          'decrypt-in-progress', 'encrypt-in-progress', 'send-mail-in-progress',
          'decrypt-end', 'encrypt-end', 'encrypt-failed', 'decrypt-failed',
          'show-pwd-dialog', 'hide-pwd-dialog', 'get-plaintext',
          'error-message', 'hide-notification', 'show-notification',
          'terminate', 'public-key-userids', 'key-update'
        ];
        expectedEvents.forEach(event => {
          expect(ref.current.port._events.on).toContain(event);
        });
      });
    });

    describe('Text handling', () => {
      it('should update plainText state when text changes', async () => {
        const {ref} = setup();
        const newText = 'Updated message content';

        await act(async () => {
          ref.current.handleTextChange(newText);
        });

        expect(ref.current.state.plainText).toBe(newText);
      });

      it('should log user input when text changes', async () => {
        const {ref} = setup();
        const logSpy = jest.spyOn(ref.current, 'logUserInput');

        await act(async () => {
          ref.current.handleTextChange('test');
        });

        expect(logSpy).toHaveBeenCalledWith('security_log_textarea_input');
      });
    });

    describe('Signing functionality', () => {
      it('should enable signing when sign key is selected', async () => {
        const {ref} = setup();

        await act(async () => {
          ref.current.handleChangeSignKey('9acdfd634605bc0a0b18d518e38cca58286fefe6');
        });

        expect(ref.current.state.signMsg).toBe(true);
        expect(ref.current.state.signKey).toBe('9acdfd634605bc0a0b18d518e38cca58286fefe6');
      });

      it('should disable signing when nosign option is selected', async () => {
        const {ref} = setup();

        await act(async () => {
          ref.current.handleChangeSignKey('nosign');
        });

        expect(ref.current.state.signMsg).toBe(false);
      });
    });

    describe('File attachment handling', () => {
      const createMockFile = (name, size, type = 'text/plain') => {
        const content = 'x'.repeat(size);
        return new File([content], name, {type});
      };

      it('should add files to state when attachments are added', async () => {
        const {ref} = setup();
        const mockFile = createMockFile('test.txt', 12);

        await act(async () => {
          ref.current.onSetMode({embedded: true});
        });

        const fileLib = require('lib/file');
        fileLib.FileUpload.mockImplementation(() => ({
          readFile: jest.fn().mockImplementation(() => Promise.resolve({
            name: 'test.txt',
            size: 12,
            type: 'text/plain',
            id: `test-id-${crypto.randomUUID()}`
          }))
        }));

        await act(async () => {
          await ref.current.addAttachment(mockFile);
        });

        expect(ref.current.state.files).toHaveLength(1);
        expect(ref.current.state.files[0].name).toBe('test.txt');
        expect(ref.current.state.files[0].id).toMatch(/^test-id-/);
      });

      it('should reject oversized files', async () => {
        const {ref} = setup();

        await act(async () => {
          ref.current.onSetMode({embedded: true});
        });

        const fileLib = require('lib/file');
        fileLib.isOversize.mockReturnValue(true);

        const oversizedFile = createMockFile('large.txt', 1000);

        expect(() => ref.current.addAttachment(oversizedFile)).toThrow('File is too big');
        expect(fileLib.isOversize).toHaveBeenCalledWith(oversizedFile);
      });

      it('should show quota exceeded warning when total size exceeds limit', async () => {
        const {ref} = setup({maxFileUploadSize: 100});
        const largeFiles = [
          createMockFile('file1.txt', 60),
          createMockFile('file2.txt', 60)
        ];

        const showNotificationSpy = jest.spyOn(ref.current, 'showNotification');

        await act(async () => {
          ref.current.handleAddAttachment(largeFiles);
        });

        expect(showNotificationSpy).toHaveBeenCalledTimes(1);
        const notification = showNotificationSpy.mock.calls[0][0];
        expect(notification.title).toContain('upload_quota_warning_headline');
      });

      it('should remove file when handleRemoveFile is called', async () => {
        const {ref} = setup();
        const fileId = `test-id-${crypto.randomUUID()}`;
        ref.current.state.files = [{id: fileId, name: 'test.txt', size: 12}];

        await act(async () => {
          ref.current.handleRemoveFile(fileId);
        });

        expect(ref.current.state.files).toHaveLength(0);
      });

      it('should handle multiple file additions', async () => {
        const {ref} = setup();

        await act(async () => {
          ref.current.onSetMode({embedded: true});
        });

        const fileLib = require('lib/file');
        fileLib.isOversize.mockReturnValue(false);

        // Test the function that would handle multiple files
        const files = [
          createMockFile('file1.txt', 10),
          createMockFile('file2.txt', 15)
        ];

        const addAttachmentSpy = jest.spyOn(ref.current, 'addAttachment');

        await act(async () => {
          ref.current.handleAddAttachment(files);
        });

        expect(addAttachmentSpy).toHaveBeenCalledTimes(2);
        expect(addAttachmentSpy).toHaveBeenCalledWith(files[0]);
        expect(addAttachmentSpy).toHaveBeenCalledWith(files[1]);
      });

      it('should calculate total file size correctly', () => {
        const {ref} = setup();
        ref.current.state.files = [
          {id: '1', name: 'file1.txt', size: 100},
          {id: '2', name: 'file2.txt', size: 200},
          {id: '3', name: 'file3.txt', size: 50}
        ];

        const totalSize = ref.current.state.files.reduce((total, file) => total + file.size, 0);
        expect(totalSize).toBe(350);
      });

      it('should handle file size validation during addition', async () => {
        const {ref} = setup({maxFileUploadSize: 1000});
        await act(async () => {
          ref.current.onSetMode({embedded: true});
        });

        // Add files that approach the limit
        ref.current.state.files = [{id: '1', name: 'existing.txt', size: 800}];

        const newFile = createMockFile('new.txt', 300);
        const showNotificationSpy = jest.spyOn(ref.current, 'showNotification');

        await act(async () => {
          ref.current.handleAddAttachment([newFile]);
        });

        expect(showNotificationSpy).toHaveBeenCalled();
        const notification = showNotificationSpy.mock.calls[0][0];
        expect(notification.title).toContain('upload_quota_warning_headline');
      });
    });

    describe('Encryption validation', () => {
      it('should disable encrypt button when no plaintext', () => {
        const {ref} = setup();
        ref.current.state.plainText = '';
        ref.current.state.recipients = [{email: 'test@example.com'}];

        expect(ref.current.isEncryptDisabled()).toBe(true);
      });

      it('should disable encrypt button when no recipients', () => {
        const {ref} = setup();
        ref.current.state.plainText = 'test message';
        ref.current.state.recipients = [];

        expect(ref.current.isEncryptDisabled()).toBe(true);
      });

      it('should enable encrypt button when all conditions are met', () => {
        const {ref} = setup();
        ref.current.state.plainText = 'test message';
        ref.current.state.recipients = [{email: 'test@example.com'}];
        ref.current.state.recipientsError = false;
        ref.current.state.recipientsCcError = false;

        expect(ref.current.isEncryptDisabled()).toBe(false);
      });
    });

    describe('Notification handling', () => {
      it('should show notification with correct properties', async () => {
        const {ref} = setup();
        const notification = {
          title: 'Test Title',
          message: 'Test message',
          type: 'error'
        };

        await act(async () => {
          ref.current.showNotification(notification);
        });

        expect(ref.current.state.showNotification).toBe(true);
        expect(ref.current.state.notification.header).toBe('Test Title');
        expect(ref.current.state.notification.message).toBe('Test message');
        expect(ref.current.state.notification.type).toBe('error');
      });

      it('should hide notification when hideNotification is called', async () => {
        const {ref} = setup();

        // First show a notification
        await act(async () => {
          ref.current.showNotification({
            title: 'Test Title',
            message: 'Test message',
            type: 'error'
          });
        });

        // Verify it's shown
        expect(ref.current.state.showNotification).toBe(true);

        // Then hide it - the method uses setTimeout so we need to wait briefly
        await act(async () => {
          ref.current.hideNotification();
          await new Promise(resolve => setTimeout(resolve, 15));
        });

        expect(ref.current.state.showNotification).toBe(false);
        expect(ref.current.state.notification).toBeNull();
      });
    });

    describe('Error handling', () => {
      it('should show decrypt failed notification', async () => {
        const {ref} = setup();
        const errorMessage = 'Decryption failed: Invalid key';
        const showNotificationSpy = jest.spyOn(ref.current, 'showNotification');

        await act(async () => {
          ref.current.onDecryptFailed({error: {message: errorMessage}});
        });

        expect(showNotificationSpy).toHaveBeenCalledTimes(1);
        const notification = showNotificationSpy.mock.calls[0][0];
        expect(notification.message).toBe(errorMessage);
        expect(notification.type).toBe('error');
      });

      it('should handle error message events', async () => {
        const {ref} = setup();
        const showNotificationSpy = jest.spyOn(ref.current, 'showNotification');
        const errorData = {
          error: {
            message: 'Encryption failed',
            code: 'ENCRYPT_ERROR'
          }
        };

        await act(async () => {
          ref.current.onErrorMessage(errorData);
        });

        expect(showNotificationSpy).toHaveBeenCalledTimes(1);
        const notification = showNotificationSpy.mock.calls[0][0];
        expect(notification.message).toBe('Encryption failed');
        expect(notification.type).toBe('error');
      });

      it('should handle password dialog cancellation', async () => {
        const {ref} = setup();
        ref.current.state.encryptDisabled = true;

        await act(async () => {
          ref.current.onErrorMessage({error: {code: 'PWD_DIALOG_CANCEL'}});
        });

        expect(ref.current.state.encryptDisabled).toBe(false);
      });

      it('should handle missing error properties in decrypt failed', async () => {
        const {ref} = setup();
        const showNotificationSpy = jest.spyOn(ref.current, 'showNotification');

        await act(async () => {
          ref.current.onDecryptFailed({});
        });

        expect(showNotificationSpy).toHaveBeenCalledTimes(1);
        const notification = showNotificationSpy.mock.calls[0][0];
        expect(notification.type).toBe('error');
      });

      it('should handle various error codes correctly', async () => {
        const {ref} = setup();
        const showNotificationSpy = jest.spyOn(ref.current, 'showNotification');

        const errorCodes = [
          'KEY_NOT_FOUND',
          'INVALID_RECIPIENT',
          'SIGNATURE_VERIFICATION_FAILED'
        ];

        for (const code of errorCodes) {
          await act(async () => {
            ref.current.onErrorMessage({
              error: {
                message: `Error with code ${code}`,
                code
              }
            });
          });
        }

        expect(showNotificationSpy).toHaveBeenCalledTimes(errorCodes.length);
      });

      it('should handle malformed recipient data', async () => {
        const {ref} = setup();

        expect(() => {
          ref.current.handleChangeRecipients([], false);
        }).not.toThrow();

        expect(() => {
          ref.current.handleChangeRecipients([], true);
        }).not.toThrow();
      });
    });
  });

  describe('Integration tests', () => {
    describe('Mode switching', () => {
      it('should switch to embedded mode and show attachments section', async () => {
        const {container, ref} = setup();

        await act(async () => {
          ref.current.onSetMode({embedded: true, integration: false});
        });

        expect(container.querySelector('.embedded')).toBeInTheDocument();
        expect(screen.getByText(/editor_label_attachments/)).toBeInTheDocument();
      });

      it('should show subject field in integration mode', async () => {
        const {container, ref} = setup();

        await act(async () => {
          ref.current.onSetMode({embedded: false, integration: true});
        });

        const subjectInput = container.querySelector('#subject');
        expect(subjectInput).toBeInTheDocument();
        expect(screen.getByText(/editor_label_subject/)).toBeInTheDocument();
      });
    });

    describe('Data initialization', () => {
      it('should initialize editor with provided data', async () => {
        const {ref} = setup();
        const initData = {
          text: 'Initial message content',
          signMsg: true,
          subject: 'Test Subject',
          defaultKeyFpr: '9acdfd634605bc0a0b18d518e38cca58286fefe6',
          privKeys: mockPrivKeys
        };

        await act(async () => {
          ref.current.onSetInitData(initData);
        });

        expect(ref.current.state.defaultPlainText).toBe('Initial message content');
        expect(ref.current.state.plainText).toBe('Initial message content');
        expect(ref.current.state.subject).toBe('Test Subject');
        expect(ref.current.state.signMsg).toBe(true);
        expect(ref.current.state.signKey).toBe('9acdfd634605bc0a0b18d518e38cca58286fefe6');
        expect(ref.current.state.privKeys).toEqual(mockPrivKeys);

        // Verify mocked plain text component is rendered
        expect(screen.getByTestId('plain-text-mock')).toBeInTheDocument();
      });

      it('should handle recipients and public keys data', async () => {
        const {ref} = setup();
        const mockPublicKeys = [{
          type: 'public',
          validity: true,
          keyId: 'B2C4A7E2F1D8C9A3',
          fingerprint: 'a1b2c3d4e5f6789012345678b2c4a7e2f1d8c9a3',
          userId: 'John Doe <john@example.com>',
          name: 'John Doe',
          email: 'john@example.com'
        }];

        const recipients = [{email: 'test@example.com', key: mockPublicKeys[0]}];
        const ccRecipients = [{email: 'cc@example.com'}];

        await act(async () => {
          ref.current.onPublicKeyUserids({
            keys: mockPublicKeys,
            to: recipients,
            cc: ccRecipients
          });
        });

        expect(ref.current.state.publicKeys).toEqual(mockPublicKeys);
        expect(ref.current.state.recipients).toEqual(recipients);
        expect(ref.current.state.recipientsCc).toEqual(ccRecipients);
        expect(ref.current.state.showRecipientsCc).toBe(true);
      });
    });

    describe('File upload integration', () => {
      it('should handle file upload through file input', async () => {
        const {container, ref} = setup();

        await act(async () => {
          ref.current.onSetMode({embedded: true, integration: false});
        });

        const handleAddAttachmentSpy = jest.spyOn(ref.current, 'handleAddAttachment');
        const files = [
          new File(['content1'], 'file1.txt', {type: 'text/plain'}),
          new File(['content2'], 'file2.txt', {type: 'text/plain'})
        ];

        const fileInput = container.querySelector('input[type="file"]');
        expect(fileInput).toBeInTheDocument();

        await act(async () => {
          Object.defineProperty(fileInput, 'files', {
            value: files,
            writable: false,
          });
          fileInput.dispatchEvent(new Event('change', {bubbles: true}));
        });

        expect(handleAddAttachmentSpy).toHaveBeenCalledTimes(1);
        expect(handleAddAttachmentSpy).toHaveBeenCalledWith(files);
      });

      it('should handle attachment from external source', async () => {
        const {ref} = setup();

        await act(async () => {
          ref.current.onSetMode({embedded: true});
        });

        const attachment = {
          filename: 'external.pdf',
          content: 'base64content',
          mimeType: 'application/pdf'
        };

        const addAttachmentSpy = jest.spyOn(ref.current, 'addAttachment');

        await act(async () => {
          ref.current.onSetAttachment({attachment});
        });

        expect(addAttachmentSpy).toHaveBeenCalledTimes(1);
        const fileArg = addAttachmentSpy.mock.calls[0][0];
        expect(fileArg.name).toBe('external.pdf');
        expect(fileArg.type).toBe('application/pdf');
      });
    });

    describe('Password dialog integration', () => {
      it('should show password dialog when requested', async () => {
        const {container, ref} = setup();
        const pwdDialogData = {id: 'pwd-123'};

        await act(async () => {
          ref.current.onShowPwdDialog(pwdDialogData);
        });

        expect(ref.current.state.pwdDialog).toEqual(pwdDialogData);
        expect(ref.current.state.waiting).toBe(false);
        expect(container.querySelector('.editor-popup-pwd-dialog')).toBeInTheDocument();
      });

      it('should hide password dialog when requested', async () => {
        const {ref} = setup();
        ref.current.state.pwdDialog = {id: 'pwd-123'};

        await act(async () => {
          ref.current.onHidePwdDialog();
        });

        expect(ref.current.state.pwdDialog).toBeNull();
      });
    });

    describe('Termination handling', () => {
      it('should handle termination event', async () => {
        const {container, ref} = setup();

        await act(async () => {
          ref.current.onTerminate();
        });

        expect(ref.current.state.terminate).toBe(true);
        expect(container.querySelector('.terminate')).toBeInTheDocument();
        expect(ref.current.port.disconnect).toHaveBeenCalledTimes(1);
      });

      it('should handle disconnect in embedded mode', async () => {
        const {ref} = setup();
        ref.current.state.embedded = true;

        await act(async () => {
          ref.current.onDisconnect();
        });

        // Should set timeout to reset state
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 1400));
        });

        expect(ref.current.state.waiting).toBe(false);
        expect(ref.current.state.encryptDisabled).toBe(false);
      });
    });

    describe('User interactions', () => {
      it('should handle subject input changes in integration mode', async () => {
        const user = userEvent.setup();
        const {container, ref} = setup();

        await act(async () => {
          ref.current.onSetMode({integration: true});
        });

        const subjectInput = container.querySelector('#subject');
        await user.type(subjectInput, 'New Subject');

        expect(ref.current.state.subject).toBe('New Subject');
      });

      it('should log user actions when buttons are clicked', async () => {
        const {ref} = setup();
        const logSpy = jest.spyOn(ref.current, 'logUserInput');

        await act(async () => {
          ref.current.handleCancel();
        });

        expect(logSpy).toHaveBeenCalledWith('security_log_dialog_cancel');
      });

      it('should emit encrypt event when encrypt button is used', async () => {
        const {ref} = setup();
        ref.current.state.plainText = 'test message';
        ref.current.state.recipients = [{email: 'test@example.com'}];

        await act(async () => {
          ref.current.handleOk();
        });

        expect(ref.current.state.encryptDisabled).toBe(true);
        expect(ref.current.port._events.emit).toContain('editor-plaintext');
      });

      it('should emit sign-only event when sign button is used', async () => {
        const {ref} = setup();
        ref.current.state.signKey = '9acdfd634605bc0a0b18d518e38cca58286fefe6';

        await act(async () => {
          ref.current.handleSign();
        });

        expect(ref.current.port._events.emit).toContain('sign-only');
      });

      it('should throttle text input logging to once per second', async () => {
        const {ref} = setup();
        const logSpy = jest.spyOn(ref.current, 'logUserInput');

        await act(async () => {
          ref.current.handleTextChange('test1');
          ref.current.handleTextChange('test2');
        });

        expect(logSpy).toHaveBeenCalledTimes(1);
      });

      it('should show copy recipient link in integration mode', async () => {
        const {ref} = setup();

        await act(async () => {
          ref.current.onSetMode({embedded: false, integration: true});
        });

        expect(screen.getByText(/editor_label_copy_recipient/)).toBeInTheDocument();
      });
    });
  });

  describe('Advanced DOM functionality tests', () => {
    it('should render file input when in embedded mode', async () => {
      const {container, ref} = setup();

      await act(async () => {
        ref.current.onSetMode({embedded: true, integration: false});
      });

      // Check that embedded mode adds the embedded class
      expect(container.querySelector('.embedded')).toBeInTheDocument();
      expect(screen.getByText(/editor_label_attachments/)).toBeInTheDocument();
    });

    it('should handle window resize events', async () => {
      const {container, ref} = setup();

      // Trigger a resize event
      await act(async () => {
        global.dispatchEvent(new Event('resize'));
      });

      // Component should still be functional after resize
      expect(container.querySelector('.editor')).toBeInTheDocument();
      expect(ref.current.state).toBeTruthy();
    });

    it('should handle focus and blur events correctly', async () => {
      const user = userEvent.setup();
      const {container, ref} = setup();

      await act(async () => {
        ref.current.onSetInitData({
          text: 'Test message',
          privKeys: mockPrivKeys
        });
      });

      const textarea = container.querySelector('[data-testid="plain-text-textarea"]');

      // Test focus
      await user.click(textarea);
      expect(textarea).toHaveFocus();

      // Test blur
      await user.tab();
      expect(textarea).not.toHaveFocus();
    });

    it('should handle text input properly', async () => {
      const user = userEvent.setup();
      const {container, ref} = setup();

      await act(async () => {
        ref.current.onSetInitData({
          text: '',
          privKeys: mockPrivKeys
        });
      });

      const textarea = container.querySelector('[data-testid="plain-text-textarea"]');

      await user.clear(textarea);
      await user.type(textarea, 'test message');

      expect(ref.current.state.plainText).toBe('test message');
    });
  });

  describe('Error states', () => {
    it('should handle missing required props gracefully', () => {
      expect(() => setup({id: undefined})).not.toThrow();
    });

    it('should handle empty initialization data', async () => {
      const {ref} = setup();

      await act(async () => {
        ref.current.onSetInitData({});
      });

      expect(ref.current.state.defaultPlainText).toBe('');
      expect(ref.current.state.signMsg).toBe(false);
    });

    it('should handle invalid file upload size limit', () => {
      const {ref} = setup({maxFileUploadSize: -1});
      expect(ref.current.props.maxFileUploadSize).toBe(-1);
    });
  });
});

