
import React from 'react';
import {expect, sinon, mount} from 'test';
import * as l10n from 'lib/l10n';
import EventHandler from 'lib/EventHandler';
import Spinner from 'components/util/Spinner';
import ContentSandbox from 'components/decrypt-message/components/ContentSandbox';
import DecryptMessage from 'components/decrypt-message/DecryptMessage';

l10n.mapToLocal();

describe('Decrypt Message tests', () => {
  const sandbox = sinon.createSandbox();

  const mockPort = () => {
    const portMock = {
      _events: {
        emit: [],
        on: [],
        send: []
      },
      on: event => portMock._events.on.push(event),
      emit: event => portMock._events.emit.push(event),
      send: event => {
        portMock._events.send.push(event);
        return new Promise(resolve => {
          resolve(event);
        });
      }
    };
    sandbox.stub(EventHandler, 'connect').returns(portMock);
  };

  const setup = propOverrides => {
    const props = {
      id: 'decrypt-message-test',
      isContainer: false,
      ...propOverrides
    };

    const wrapper = mount(<DecryptMessage {...props} />);

    return {
      props,
      wrapper,
      // fn: wrapper.find('...'),
    };
  };

  beforeEach(() => {
    mockPort();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should render', () => {
    const {wrapper} = setup();
    expect(wrapper.exists()).to.equal(true);
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
      it('should work', () => {
        const {wrapper} = setup();
        const component = wrapper.instance();
        expect(wrapper.state().files).has.length(0);
        component.onDecryptedAttachment({attachment: attachmentFixture});
        expect(wrapper.state().files).has.length(1);
        expect(wrapper.state().waiting).to.equal(false);
      });
    });
    describe('onSignatureVerification', () => {
      it('should work', () => {
        const {wrapper} = setup();
        const component = wrapper.instance();
        expect(wrapper.state().signer).to.be.null;
        component.onSignatureVerification({signers: signaturesFixture});
        expect(wrapper.state().signer).not.to.be.null;
      });
    });
  });

  describe('Do some integration tests', () => {
    it('should initialize the component and should wait on the form decrypted-message event', () => {
      const {wrapper} = setup();
      const component = wrapper.instance();
      expect(component.port._events.on).to.include.members(['decrypted-message', 'add-decrypted-attachment',
        'signature-verification']);
      expect(component.port._events.emit).to.include.members(['decrypt-message-init']);
      expect(wrapper.find(Spinner).exists()).to.equal(true);
    });

    it('should show the sandbox iframe with the decrypted message', () => {
      const {wrapper} = setup();
      const component = wrapper.instance();
      const message = 'This is an encrypted message!';
      const event = {
        message
      };
      component.onDecryptedMessage(event);
      wrapper.update();
      expect(wrapper.state('message')).to.equal(message);
      const contentSandbox = wrapper.find(ContentSandbox);
      expect(wrapper.find(ContentSandbox).prop('value')).to.equal(message);
      expect(contentSandbox.find('iframe').exists()).to.equal(true);
    });
    it('should show singature in footer when signature available', () => {
      const {wrapper} = setup();
      const component = wrapper.instance();
      const message = 'This is an encrypted message!';
      const event = {
        message
      };
      component.onDecryptedMessage(event);
      wrapper.update();
      component.onSignatureVerification({signers: signaturesFixture});
      wrapper.update();
      expect(wrapper.state().signer.valid).to.equal(true);
      const signatureFooter = wrapper.find('.modal-footer');
      expect(signatureFooter.exists()).to.equal(true);
    });
  });
});
