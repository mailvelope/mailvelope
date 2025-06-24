import React from 'react';
import {render, screen, act} from '@testing-library/react';
import * as l10n from 'lib/l10n';
import DecryptMessage from 'components/decrypt-message/DecryptMessage';

jest.mock('../../../../src/lib/EventHandler', () => require('../../../__mocks__/lib/EventHandler').default);
jest.mock('../../../../src/components/decrypt-message/components/ContentSandbox', () => require('../../../__mocks__/components/decrypt-message/components/ContentSandbox').default);

describe('Decrypt Message tests', () => {
  const setup = (portResponses = {}, portOptions = {}) => {
    // Configure mock responses BEFORE rendering
    const MockEventHandler = require('../../../__mocks__/lib/EventHandler').default;
    MockEventHandler.setMockResponses(portResponses, portOptions);

    const props = {
      id: 'decrypt-message-test',
      isContainer: false
    };
    const ref = React.createRef();
    const rtlUtils = render(<DecryptMessage ref={ref} {...props} />);

    return {
      ref,
      ...rtlUtils
    };
  };

  beforeAll(() => {
    l10n.mapToLocal();
  });

  afterEach(() => {
    const MockEventHandler = require('../../../__mocks__/lib/EventHandler').default;
    MockEventHandler.clearMockResponses();
  });

  it('should render', () => {
    const {container} = setup();
    expect(container.querySelector('.decrypt-msg')).toBeInTheDocument();
  });

  const signaturesFixture = [
    {
      'valid': true,
      'keyDetails': {
        'name': 'Tester',
        'email': 'tester@test.com',
        'fingerprint': '2CE0 DBDC B17A EA6F 33B0 28C1 F1E7 0322 973D FEDE'
      },
      'keyId': 'f1e70322973dfede',
    }
  ];

  describe('Unit tests', () => {
    const attachmentFixture = {
      'type': 'attachment',
      'content': 'data:text/plain;base64,VGhpcyBpcyB0b3Agc2VjcmV0IQ==',
      'mimeType': 'text/plain',
      'filename': 'secret_attachment.txt'
    };

    describe('onDecryptedAttachment', () => {
      it('should display file panel when attachment is decrypted', async () => {
        const {container, ref} = setup();

        // Initially no files to download
        expect(container.querySelector('.file-panel')).not.toBeInTheDocument();

        // Simulate decrypted attachment
        await act(async () => {
          ref.current.onDecryptedAttachment({attachment: attachmentFixture});
        });

        expect(container.querySelector('.file-panel')).toBeInTheDocument();
        expect(screen.queryByRole('status')).not.toBeInTheDocument(); // spinner should be gone
      });

      it('should update component state with attachment data', async () => {
        const {ref} = setup();

        await act(async () => {
          ref.current.onDecryptedAttachment({attachment: attachmentFixture});
        });

        expect(ref.current.state.files).toHaveLength(1);
        expect(ref.current.state.files[0].name).toBe(attachmentFixture.filename);
      });
    });

    describe('onSignatureVerification', () => {
      it('should update state when signature is verified', async () => {
        const {container, ref} = setup();

        // Initial state check
        expect(container.querySelector('#SignatureDetails')).not.toBeInTheDocument();

        // Simulate signature verification
        await act(async () => {
          ref.current.onSignatureVerification({signers: signaturesFixture});
        });

        expect(ref.current.state.signer).not.toBeNull();
        expect(ref.current.state.signer).toEqual(signaturesFixture[0]);
      });

      it('should handle multiple signers', async () => {
        const {ref} = setup();

        const multipleSigners = [
          ...signaturesFixture,
          {
            'valid': false,
            'keyDetails': {
              'name': 'Invalid Tester',
              'email': 'invalid@test.com',
              'fingerprint': '1111 2222 3333 4444 5555 6666 7777 8888 9999 AAAA'
            },
            'keyId': '7777888899999aaa',
          }
        ];

        await act(async () => {
          ref.current.onSignatureVerification({signers: multipleSigners});
        });

        // Should take the first signer
        expect(ref.current.state.signer).toEqual(multipleSigners[0]);
      });
    });

    describe('onDecryptedMessage', () => {
      it('should update state with decrypted message', async () => {
        const {ref} = setup();
        const message = 'This is an encrypted message!';

        await act(async () => {
          ref.current.onDecryptedMessage({message});
        });

        expect(ref.current.state.message).toBe(message);
        expect(ref.current.state.decryptDone).toBe(true);
      });

      it('should handle waiting state changes via onWaiting', async () => {
        const {ref} = setup();

        // Initially waiting should be true
        expect(ref.current.state.waiting).toBe(true);

        await act(async () => {
          ref.current.onWaiting({waiting: false});
        });

        expect(ref.current.state.waiting).toBe(false);
      });
    });
  });

  describe('Integration tests', () => {
    it('should initialize component and register event listeners', async () => {
      const {ref} = setup();

      expect(ref.current.port._events.on).toContain('decrypted-message');
      expect(ref.current.port._events.on).toContain('add-decrypted-attachment');
      expect(ref.current.port._events.on).toContain('signature-verification');
      expect(screen.getByRole('status')).toBeInTheDocument(); // loading spinner
    });

    it('should show sandbox iframe with decrypted message', async () => {
      const {container, ref} = setup();
      const message = 'This is an encrypted message!';

      // Simulate decrypted message
      await act(async () => {
        ref.current.onDecryptedMessage({message});
      });

      expect(ref.current.state.message).toBe(message);

      const contentSandbox = container.querySelector('[data-testid="content-sandbox"]');
      expect(contentSandbox).toBeInTheDocument();
    });

    it('should handle both message and attachment decryption', async () => {
      const {container, ref} = setup();
      const message = 'Encrypted message content';
      const attachment = {
        'type': 'attachment',
        'content': 'data:text/plain;base64,VGVzdCBhdHRhY2htZW50',
        'mimeType': 'text/plain',
        'filename': 'test.txt'
      };

      // Decrypt message first
      await act(async () => {
        ref.current.onDecryptedMessage({message});
      });

      // Then add attachment
      await act(async () => {
        ref.current.onDecryptedAttachment({attachment});
      });

      expect(ref.current.state.message).toBe(message);
      expect(ref.current.state.files).toHaveLength(1);
      expect(container.querySelector('.file-panel')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="content-sandbox"]')).toBeInTheDocument();
    });

    it('should display signature verification alongside message', async () => {
      const {ref} = setup();
      const message = 'Signed and encrypted message';

      // Decrypt message and verify signature
      await act(async () => {
        ref.current.onDecryptedMessage({message});
      });

      await act(async () => {
        ref.current.onSignatureVerification({signers: signaturesFixture});
      });

      expect(ref.current.state.message).toBe(message);
      expect(ref.current.state.signer).toEqual(signaturesFixture[0]);
      expect(ref.current.state.decryptDone).toBe(true);
    });

    it('should handle error states gracefully', async () => {
      const {ref} = setup();

      // Simulate error in signature verification (empty signers array)
      await act(async () => {
        ref.current.onSignatureVerification({signers: []});
      });

      // Component should still be functional
      expect(ref.current.state.signer).toBeNull();

      // Should still be able to decrypt message
      await act(async () => {
        ref.current.onDecryptedMessage({message: 'test'});
      });

      expect(ref.current.state.message).toBe('test');
    });
  });

  describe('Security considerations', () => {
    it('should use sandbox iframe for message content', async () => {
      // Mock alert to detect if scripts execute
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      const {container, ref} = setup();
      const maliciousMessage = '<script>alert("xss")</script><img src="x" onerror="alert(\'img-xss\')">';

      await act(async () => {
        ref.current.onDecryptedMessage({message: maliciousMessage});
      });

      const sandbox = container.querySelector('[data-testid="content-sandbox"]');
      expect(sandbox).toBeInTheDocument();

      // Verify the content was rendered in the mock sandbox
      const content = container.querySelector('[data-testid="content-sandbox-content"]');
      expect(content).toBeInTheDocument();
      expect(content.textContent).toBe(maliciousMessage);

      // Verify no script execution occurred (scripts should be blocked by sandbox)
      expect(alertSpy).not.toHaveBeenCalled();

      // Verify the malicious content was passed to the component but contained
      expect(ref.current.state.message).toBe(maliciousMessage);

      alertSpy.mockRestore();
    });

    it('should handle potentially malicious attachment content safely', async () => {
      // Mock alert to detect if scripts execute
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      const {ref} = setup();

      const maliciousAttachment = {
        'type': 'attachment',
        'content': 'data:text/html;base64,PHNjcmlwdD5hbGVydCgieHNzIik8L3NjcmlwdD4=', // <script>alert("xss")</script>
        'mimeType': 'text/html',
        'filename': 'malicious.html'
      };

      await act(async () => {
        ref.current.onDecryptedAttachment({attachment: maliciousAttachment});
      });

      // Verify attachment was processed but MIME type was sanitized
      expect(ref.current.state.files).toHaveLength(1);
      expect(ref.current.state.files[0].name).toBe('malicious.html');

      // Verify no script execution occurred
      expect(alertSpy).not.toHaveBeenCalled();

      // Verify MIME type was changed to safe application/octet-stream
      expect(maliciousAttachment.mimeType).toBe('application/octet-stream');

      alertSpy.mockRestore();
    });
  });
});
