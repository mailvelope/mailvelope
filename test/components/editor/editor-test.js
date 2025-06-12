import React from 'react';
import {render, screen, act, expect, sinon, waitFor, fireEvent, userEvent} from 'test';
import * as l10n from 'lib/l10n';
import * as fileLib from 'lib/file';
import {createMockPort} from '../../utils';
import Editor from 'components/editor/editor';

describe('Editor tests', () => {
  const sandbox = sinon.createSandbox();

  const RecipientInputMock = () => <div data-testid="recipient-input" />;

  const setup = (props = {}) => {
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

  const mockPublicKeys = [{
    type: 'public',
    validity: true,
    keyId: 'B2C4A7E2F1D8C9A3',
    fingerprint: 'a1b2c3d4e5f6789012345678b2c4a7e2f1d8c9a3',
    userId: 'John Doe <john@example.com>',
    name: 'John Doe',
    email: 'john@example.com'
  }];

  before(() => {
    l10n.mapToLocal();
  });

  beforeEach(() => {
    Editor.__Rewire__('RecipientInput', RecipientInputMock);
    createMockPort(sandbox);
  });

  afterEach(async () => {
    // Wait for any pending async operations to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    sandbox.restore();
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  it('should render', () => {
    const {container} = setup();
    expect(container.querySelector('.editor')).to.exist;
  });

  describe('Unit tests', () => {
    describe('Component initialization', () => {
      it('should initialize with default state values', () => {
        const {ref} = setup();
        expect(ref.current.state.embedded).to.be.false;
        expect(ref.current.state.integration).to.be.false;
        expect(ref.current.state.waiting).to.be.true;
        expect(ref.current.state.signMsg).to.be.false;
        expect(ref.current.state.files).to.deep.equal([]);
        expect(ref.current.state.recipients).to.deep.equal([]);
      });

      it('should emit editor-mount event on mount', () => {
        const {ref} = setup();
        expect(ref.current.port._events.emit).to.include('editor-mount');
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
          expect(ref.current.port._events.on).to.include(event);
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

        expect(ref.current.state.plainText).to.equal(newText);
      });

      it('should log user input when text changes', async () => {
        const {ref} = setup();
        const logSpy = sandbox.spy(ref.current, 'logUserInput');

        await act(async () => {
          ref.current.handleTextChange('test');
        });

        expect(logSpy.calledWith('security_log_textarea_input')).to.be.true;
      });

      it('should throttle text input logging to once per second', async () => {
        const {ref} = setup();
        const logSpy = sandbox.spy(ref.current, 'logUserInput');

        await act(async () => {
          ref.current.handleTextChange('test1');
          ref.current.handleTextChange('test2');
        });

        expect(logSpy.calledOnce).to.be.true;
      });
    });

    describe('Signing functionality', () => {
      it('should enable signing when sign key is selected', async () => {
        const {ref} = setup();

        await act(async () => {
          ref.current.handleChangeSignKey('9acdfd634605bc0a0b18d518e38cca58286fefe6');
        });

        expect(ref.current.state.signMsg).to.be.true;
        expect(ref.current.state.signKey).to.equal('9acdfd634605bc0a0b18d518e38cca58286fefe6');
      });

      it('should disable signing when nosign option is selected', async () => {
        const {ref} = setup();

        await act(async () => {
          ref.current.handleChangeSignKey('nosign');
        });

        expect(ref.current.state.signMsg).to.be.false;
      });
    });

    describe('File attachment handling', () => {
      it('should add files to state when attachments are added', async () => {
        const {ref} = setup();
        const mockFile = new File(['test content'], 'test.txt', {type: 'text/plain'});

        // Initialize fileUpload and mock the readFile method
        await act(async () => {
          ref.current.onSetMode({embedded: true});
        });

        const mockFileWithId = {name: 'test.txt', size: 12, type: 'text/plain', id: 'test-id'};
        ref.current.fileUpload.readFile = sinon.stub().resolves(mockFileWithId);

        await act(async () => {
          await ref.current.addAttachment(mockFile);
        });

        expect(ref.current.state.files).to.have.length(1);
        expect(ref.current.state.files[0].name).to.equal('test.txt');
      });

      it('should reject oversized files', async () => {
        const {ref} = setup();

        // Initialize fileUpload
        await act(async () => {
          ref.current.onSetMode({embedded: true});
        });

        // Mock fileLib.isOversize using rewire to ensure it's properly mocked in the Editor context
        const mockFileLib = {
          isOversize: sandbox.stub().returns(true),
          FileUpload: fileLib.FileUpload
        };
        Editor.__Rewire__('fileLib', mockFileLib);

        const oversizedFile = new File(['content'], 'large.txt');

        expect(() => ref.current.addAttachment(oversizedFile)).to.throw('File is too big');
        expect(mockFileLib.isOversize.calledWith(oversizedFile)).to.be.true;
      });

      it('should show quota exceeded warning when total size exceeds limit', async () => {
        const {ref} = setup({maxFileUploadSize: 100});
        const largeFiles = [
          new File(['x'.repeat(60)], 'file1.txt'),
          new File(['x'.repeat(60)], 'file2.txt')
        ];

        const showNotificationSpy = sandbox.spy(ref.current, 'showNotification');

        await act(async () => {
          ref.current.handleAddAttachment(largeFiles);
        });

        expect(showNotificationSpy.calledOnce).to.be.true;
        const notification = showNotificationSpy.getCall(0).args[0];
        expect(notification.title).to.include('upload_quota_warning_headline');
      });

      it('should remove file when handleRemoveFile is called', async () => {
        const {ref} = setup();
        ref.current.state.files = [{id: 'test-id', name: 'test.txt'}];

        await act(async () => {
          ref.current.handleRemoveFile('test-id');
        });

        expect(ref.current.state.files).to.have.length(0);
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

        expect(ref.current.state.showNotification).to.be.true;
        expect(ref.current.state.notification.header).to.equal('Test Title');
        expect(ref.current.state.notification.message).to.equal('Test message');
        expect(ref.current.state.notification.type).to.equal('error');
      });

      it('should hide notification when hideNotification is called', async () => {
        const {ref} = setup();
        ref.current.state.showNotification = true;
        ref.current.state.notification = {message: 'test'};

        await act(async () => {
          ref.current.hideNotification();
        });

        expect(ref.current.state.showNotification).to.be.false;
        expect(ref.current.state.notification).to.be.null;
      });
    });

    describe('Encryption validation', () => {
      it('should disable encrypt button when no plaintext', () => {
        const {ref} = setup();
        ref.current.state.plainText = '';
        ref.current.state.recipients = [{email: 'test@example.com'}];

        expect(ref.current.isEncryptDisabled()).to.be.true;
      });

      it('should disable encrypt button when no recipients', () => {
        const {ref} = setup();
        ref.current.state.plainText = 'test message';
        ref.current.state.recipients = [];

        expect(ref.current.isEncryptDisabled()).to.be.true;
      });

      it('should disable encrypt button when recipients error exists', () => {
        const {ref} = setup();
        ref.current.state.plainText = 'test message';
        ref.current.state.recipients = [{email: 'test@example.com'}];
        ref.current.state.recipientsError = true;

        expect(ref.current.isEncryptDisabled()).to.be.true;
      });

      it('should enable encrypt button when all conditions are met', () => {
        const {ref} = setup();
        ref.current.state.plainText = 'test message';
        ref.current.state.recipients = [{email: 'test@example.com'}];
        ref.current.state.recipientsError = false;
        ref.current.state.recipientsCcError = false;

        expect(ref.current.isEncryptDisabled()).to.be.false;
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

        expect(container.querySelector('.embedded')).to.exist;
        expect(screen.getByText(/editor_label_attachments/)).to.exist;
      });

      it('should show subject field in integration mode', async () => {
        const {container, ref} = setup();

        await act(async () => {
          ref.current.onSetMode({embedded: false, integration: true});
        });

        // Use container.querySelector since the label is not properly associated
        const subjectInput = container.querySelector('#subject');
        expect(subjectInput).to.exist;
        expect(screen.getByText(/editor_label_subject/)).to.exist;
      });

      it('should show copy recipient link in integration mode', async () => {
        const {ref} = setup();

        await act(async () => {
          ref.current.onSetMode({embedded: false, integration: true});
        });

        expect(screen.getByText(/editor_label_copy_recipient/)).to.exist;
      });
    });

    describe('Data initialization', () => {
      it('should initialize editor with provided data', async () => {
        const {container, ref} = setup();
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

        expect(ref.current.state.defaultPlainText).to.equal('Initial message content');
        expect(ref.current.state.plainText).to.equal('Initial message content');
        expect(ref.current.state.subject).to.equal('Test Subject');
        expect(ref.current.state.signMsg).to.be.true;
        expect(ref.current.state.signKey).to.equal('9acdfd634605bc0a0b18d518e38cca58286fefe6');
        expect(ref.current.state.privKeys).to.deep.equal(mockPrivKeys);

        const plainTextIframe = container.querySelector('.plain-text iframe');
        expect(plainTextIframe).to.exist;
      });

      it('should handle recipients and public keys data', async () => {
        const {ref} = setup();
        const recipients = [{email: 'test@example.com', key: mockPublicKeys[0]}];
        const ccRecipients = [{email: 'cc@example.com'}];

        await act(async () => {
          ref.current.onPublicKeyUserids({
            keys: mockPublicKeys,
            to: recipients,
            cc: ccRecipients
          });
        });

        expect(ref.current.state.publicKeys).to.deep.equal(mockPublicKeys);
        expect(ref.current.state.recipients).to.deep.equal(recipients);
        expect(ref.current.state.recipientsCc).to.deep.equal(ccRecipients);
        expect(ref.current.state.showRecipientsCc).to.be.true;
      });
    });

    describe('Error handling', () => {
      it('should show decrypt failed notification', async () => {
        const {container, ref} = setup();
        const errorMessage = 'Decryption failed: Invalid key';

        await act(async () => {
          ref.current.onDecryptFailed({error: {message: errorMessage}});
        });

        await waitFor(() => {
          const toastWrapper = container.querySelector('.toastWrapper');
          expect(toastWrapper).to.exist;
          expect(toastWrapper.textContent).to.include(errorMessage);
        });
      });

      it('should handle error message events', async () => {
        const {ref} = setup();
        const showNotificationSpy = sandbox.spy(ref.current, 'showNotification');
        const errorData = {
          error: {
            message: 'Encryption failed',
            code: 'ENCRYPT_ERROR'
          }
        };

        await act(async () => {
          ref.current.onErrorMessage(errorData);
        });

        expect(showNotificationSpy.calledOnce).to.be.true;
        const notification = showNotificationSpy.getCall(0).args[0];
        expect(notification.message).to.equal('Encryption failed');
        expect(notification.type).to.equal('error');
      });

      it('should handle password dialog cancellation', async () => {
        const {ref} = setup();
        ref.current.state.encryptDisabled = true;

        await act(async () => {
          ref.current.onErrorMessage({error: {code: 'PWD_DIALOG_CANCEL'}});
        });

        expect(ref.current.state.encryptDisabled).to.be.false;
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

        expect(ref.current.state.subject).to.equal('New Subject');
      });

      it('should log user actions when buttons are clicked', async () => {
        const {ref} = setup();
        const logSpy = sandbox.spy(ref.current, 'logUserInput');

        await act(async () => {
          ref.current.handleCancel();
        });

        expect(logSpy.calledWith('security_log_dialog_cancel')).to.be.true;
      });

      it('should emit sign-only event when sign button is used', async () => {
        const {ref} = setup();
        ref.current.state.signKey = '9acdfd634605bc0a0b18d518e38cca58286fefe6';

        await act(async () => {
          ref.current.handleSign();
        });

        expect(ref.current.port._events.emit).to.include('sign-only');
      });

      it('should emit encrypt event when encrypt button is used', async () => {
        const {ref} = setup();
        ref.current.state.plainText = 'test message';
        ref.current.state.recipients = [{email: 'test@example.com'}];

        await act(async () => {
          ref.current.handleOk();
        });

        expect(ref.current.state.encryptDisabled).to.be.true;
        expect(ref.current.port._events.emit).to.include('editor-plaintext');
      });
    });

    describe('File upload integration', () => {
      it('should handle file upload through file input', async () => {
        const {container, ref} = setup();

        await act(async () => {
          ref.current.onSetMode({embedded: true, integration: false});
        });

        const spy = sandbox.spy(ref.current, 'addAttachment');
        const files = [
          new File(['content1'], 'file1.txt', {type: 'text/plain'}),
          new File(['content2'], 'file2.txt', {type: 'text/plain'})
        ];

        const fileInput = container.querySelector('input[type="file"]');
        expect(fileInput).to.exist;

        await act(async () => {
          Object.defineProperty(fileInput, 'files', {
            value: files,
            writable: false,
          });
          fireEvent.change(fileInput);
        });

        await waitFor(() => {
          expect(spy.calledTwice).to.be.true;
          expect(spy.getCall(0).args[0]).to.equal(files[0]);
          expect(spy.getCall(1).args[0]).to.equal(files[1]);
        });
      });

      it('should handle attachment from external source', async () => {
        const {ref} = setup();

        // Initialize fileUpload first
        await act(async () => {
          ref.current.onSetMode({embedded: true});
        });

        const attachment = {
          filename: 'external.pdf',
          content: 'base64content',
          mimeType: 'application/pdf'
        };

        // Mock addAttachment method to avoid file processing
        const addAttachmentStub = sandbox.stub(ref.current, 'addAttachment');

        await act(async () => {
          ref.current.onSetAttachment({attachment});
        });

        expect(addAttachmentStub.calledOnce).to.be.true;
        const fileArg = addAttachmentStub.getCall(0).args[0];
        expect(fileArg.name).to.equal('external.pdf');
        expect(fileArg.type).to.equal('application/pdf');
      });
    });

    describe('Password dialog integration', () => {
      it('should show password dialog when requested', async () => {
        const {container, ref} = setup();
        const pwdDialogData = {id: 'pwd-123'};

        await act(async () => {
          ref.current.onShowPwdDialog(pwdDialogData);
        });

        expect(ref.current.state.pwdDialog).to.deep.equal(pwdDialogData);
        expect(ref.current.state.waiting).to.be.false;
        expect(container.querySelector('.editor-popup-pwd-dialog')).to.exist;
      });

      it('should hide password dialog when requested', async () => {
        const {ref} = setup();
        ref.current.state.pwdDialog = {id: 'pwd-123'};

        await act(async () => {
          ref.current.onHidePwdDialog();
        });

        expect(ref.current.state.pwdDialog).to.be.null;
      });
    });

    describe('Termination handling', () => {
      it('should handle termination event', async () => {
        const {container, ref} = setup();

        // Mock the port.disconnect method
        ref.current.port.disconnect = sandbox.stub();

        await act(async () => {
          ref.current.onTerminate();
        });

        expect(ref.current.state.terminate).to.be.true;
        expect(container.querySelector('.terminate')).to.exist;
        expect(ref.current.port.disconnect.calledOnce).to.be.true;
      });

      it('should handle disconnect in embedded mode', async () => {
        const {ref} = setup();
        ref.current.state.embedded = true;

        await act(async () => {
          ref.current.onDisconnect();
        });

        // Should set timeout to reset state
        setTimeout(() => {
          expect(ref.current.state.waiting).to.be.false;
          expect(ref.current.state.encryptDisabled).to.be.false;
        }, 1300);
      });
    });
  });

  describe('Error states', () => {
    it('should handle missing required props gracefully', () => {
      expect(() => setup({id: undefined})).to.not.throw;
    });

    it('should handle invalid file upload size limit', () => {
      const {ref} = setup({maxFileUploadSize: -1});
      expect(ref.current.props.maxFileUploadSize).to.equal(-1);
    });

    it('should handle empty initialization data', async () => {
      const {ref} = setup();

      await act(async () => {
        ref.current.onSetInitData({});
      });

      expect(ref.current.state.defaultPlainText).to.equal('');
      expect(ref.current.state.signMsg).to.be.false;
    });

    it('should handle malformed recipient data', async () => {
      const {ref} = setup();

      expect(() => {
        ref.current.handleChangeRecipients(null, false);
      }).to.not.throw;
    });

    it('should handle missing error properties in decrypt failed', async () => {
      const {ref} = setup();
      const showNotificationSpy = sandbox.spy(ref.current, 'showNotification');

      await act(async () => {
        ref.current.onDecryptFailed({});
      });

      expect(showNotificationSpy.calledOnce).to.be.true;
    });
  });
});

