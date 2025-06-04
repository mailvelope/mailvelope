import React from 'react';
import {render, act, expect, sinon, waitFor, fireEvent} from 'test';
import * as l10n from 'lib/l10n';
import {createMockPort} from '../../utils';
import Editor from 'components/editor/editor';

l10n.mapToLocal();

describe('Editor tests', () => {
  const sandbox = sinon.createSandbox();

  const RecipientInputMock = () => <div />;

  const setup = () => {
    const props = {
      id: 'editor-test'
    };

    const ref = React.createRef();
    const rtlUtils = render(<Editor ref={ref} {...props} />);

    return {
      ref,
      ...rtlUtils,
    };
  };

  beforeEach(() => {
    Editor.__Rewire__('RecipientInput', RecipientInputMock);
    createMockPort(sandbox);
  });

  afterEach(() => {
    sandbox.restore();
    /* eslint-disable-next-line no-undef */
    __rewire_reset_all__();
  });

  it('should render', () => {
    const {container} = setup();
    expect(container.querySelector('.editor')).to.exist;
  });

  describe('Do some integration tests', () => {
    it('should initialize the component with the given default text', async () => {
      const {container, ref} = setup();

      await act(async () => {
        ref.current.onSetInitData({
          text: 'This is a sample text!',
          signMsg: true,
          defaultKeyFpr: '9acdfd634605bc0a0b18d518e38cca58286fefe6',
          privKeys: [{
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
          }]
        });
      });

      expect(ref.current.state.signKey).to.equal('9acdfd634605bc0a0b18d518e38cca58286fefe6');

      // Check for the PlainText iframe instead of direct textarea access
      const plainTextIframe = container.querySelector('.plain-text iframe');
      expect(plainTextIframe).to.exist;
      expect(ref.current.state.defaultPlainText).to.equal('This is a sample text!');
    });

    it('should show editor in embedded mode', async () => {
      const {container, ref} = setup();

      await act(async () => {
        ref.current.onSetMode({embedded: true, integration: false});
      });

      expect(container.querySelector('.embedded')).to.exist;
    });

    it('should show error notification when decrypt failed', async () => {
      const {container, ref} = setup();
      ref.current.hideNotification = () => false;

      await act(async () => {
        ref.current.onDecryptFailed({error: {message: 'Error message!'}});
      });

      // Wait for the notification to appear and check the Toast structure
      await waitFor(() => {
        const toastWrapper = container.querySelector('.toastWrapper');
        expect(toastWrapper).to.exist;
        const toastContent = toastWrapper.textContent;
        expect(toastContent).to.include('Error message!');
      });
    });

    it('should call addAttachment for each file upload', async () => {
      const {container, ref} = setup();

      // Set the editor to embedded mode so the FileUpload component is visible
      await act(async () => {
        ref.current.onSetMode({embedded: true, integration: false});
      });

      // Create spy after the component is in the right mode
      const spy = sandbox.spy(ref.current, 'addAttachment');

      const files = [
        new Blob(['sampleFile1'], {type: 'text/plain'}),
        new Blob(['sampleFile2'], {type: 'text/plain'})
      ];

      // Set File constructor properties for the blobs to make them behave like File objects
      Object.defineProperty(files[0], 'name', {value: 'file1.txt', writable: false});
      Object.defineProperty(files[1], 'name', {value: 'file2.txt', writable: false});

      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).to.exist;

      // Use fireEvent to properly simulate file input change
      await act(async () => {
        Object.defineProperty(fileInput, 'files', {
          value: files,
          writable: false,
        });
        fireEvent.change(fileInput);
      });

      // Wait for async file processing to complete
      await waitFor(() => {
        expect(spy.calledTwice).to.equal(true);
        expect(spy.getCall(0).args[0]).to.equal(files[0]);
        expect(spy.getCall(1).args[0]).to.equal(files[1]);
      });
    });
  });
});

