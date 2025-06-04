import React from 'react';
import {render, screen, act, expect, sinon} from 'test';
import * as l10n from 'lib/l10n';
import {createMockPort} from '../../utils';
import DecryptMessage from 'components/decrypt-message/DecryptMessage';

l10n.mapToLocal();

describe('Decrypt Message tests', () => {
  const sandbox = sinon.createSandbox();

  const setup = () => {
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

  beforeEach(() => {
    createMockPort(sandbox);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should render', () => {
    const {container} = setup();
    expect(container.querySelector('.decrypt-msg')).to.exist;
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

  describe('Do some unit tests', () => {
    const attachmentFixture = {
      'type': 'attachment',
      'content': 'data:text/plain;base64,VGhpcyBpcyB0b3Agc2VjcmV0IQ==',
      'mimeType': 'text/plain',
      'filename': 'secret_attachment.txt'
    };

    describe('onDecryptedAttachment', () => {
      it('should work', async () => {
        const {container, ref} = setup();
        // No files to download
        expect(container.querySelector('.file-panel')).to.not.exist;
        // Simulate decrypted attachment
        await act(async () => {
          ref.current.onDecryptedAttachment({attachment: attachmentFixture});
        });
        expect(container.querySelector('.file-panel')).to.exist;
        expect(screen.queryByRole('status')).to.not.exist; // spinner
      });
    });

    describe('onSignatureVerification', () => {
      it('should work', async () => {
        const {container, ref} = setup();
        // Initial state check
        expect(container.querySelector('#SignatureDetails')).to.not.exist;
        // Simulate signature verification
        await act(async () => {
          ref.current.onSignatureVerification({signers: signaturesFixture});
        });
        expect(ref.current.state.signer).not.to.be.null;
      });
    });
  });

  describe('Do some integration tests', () => {
    it('should initialize the component and should wait on the form decrypted-message event', async () => {
      const {ref} = setup();
      expect(ref.current.port._events.on).to.include('decrypted-message');
      expect(ref.current.port._events.on).to.include('add-decrypted-attachment');
      expect(ref.current.port._events.on).to.include('signature-verification');
      expect(screen.getByRole('status')).to.exist; // spinner
    });

    it('should show the sandbox iframe with the decrypted message', async () => {
      const {container, ref} = setup();
      const message = 'This is an encrypted message!';
      // Simulate decrypted message
      await act(async () => {
        ref.current.onDecryptedMessage({message});
      });
      expect(ref.current.state.message).to.equal(message);
      const contentSandbox = container.querySelector('iframe');
      expect(contentSandbox).to.have.attribute('sandbox');
    });
  });
});
