/* eslint no-unused-vars: off */
import React from 'react';
import {expect, sinon, mount} from 'test';
import mvelo from 'lib/lib-mvelo';
import * as l10n from 'lib/l10n';
import EditorFooter from 'components/editor/components/EditorFooter';
import PlainText from 'components/editor/components/PlainText';
import Editor from 'components/editor/editor';

$.fx.off = true;
l10n.mapToLocal();

describe('Editor tests', () => {
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
        return new Promise((resolve, reject) => {
          resolve(event);
        });
      }
    };
    sandbox.stub(mvelo.EventHandler, 'connect').returns(portMock);
  };

  const setup = propOverrides => {
    const props = {
      id: 'editor-test',
      embedded: true,
      recipientInput: false,
      ...propOverrides
    };

    const wrapper = mount(<Editor {...props} />);

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

  describe('Do some unit tests', () => {

  });

  describe('Do some integration tests', () => {
    it('should initialize the component with the given default text', () => {
      const {wrapper} = setup();
      const component = wrapper.instance();
      component.onSetInitData({text: 'This is a sample text!', signMsg: true, defaultKeyFpr: '9acdfd634605bc0a0b18d518e38cca58286fefe6', privKeys: [{type: 'private', validity: true, keyId: 'E47CCA58286FEFE6', fingerprint: '9acdfd634605bc0a0b18d518e38cca58286fefe6', userId: 'Max Mustermann <max.muster@mann.com>', name: 'Max Mustermann', email: 'max.muster@mann.com', exDate: false, crDate: '2018-10-11T15:45:00.000Z', algorithm: 'RSA (Encrypt or Sign)', bitLength: 4096}]});
      expect(wrapper.state().signKey).to.equal('9acdfd634605bc0a0b18d518e38cca58286fefe6');
      wrapper.update();
      const plainText = wrapper.find(PlainText);
      expect(plainText.props().defaultValue).to.equal('This is a sample text!');
    });

    it('should show editor in modal when not embedded', () => {
      const {wrapper} = setup({embedded: false});
      const component = wrapper.instance();
      expect(wrapper.find('.m-modal').exists()).to.equal(true);
    });

    it('should show error modal when decrypt failed', () => {
      const {wrapper} = setup();
      const component = wrapper.instance();
      component.onDecryptFailed({error: {message: 'Error message!'}});
      wrapper.update();
      expect(wrapper.find('ModalDialog Alert').props().message).to.equal('Error message!');
    });

    /* test shows side effects and has to be fixed */
    it.skip('should call addAttachment for each file upload', () => {
      const {wrapper} = setup();
      const component = wrapper.instance();
      const spy = sandbox.spy(component, 'addAttachment');

      const files = [
        new Blob(['sampleFile1'], {type: 'text/plain'}),
        new Blob(['sampleFile2'], {type: 'text/plain'})
      ];

      // const stub = sandbox.stub(FileReader.prototype, 'readAsDataURL');
      // stub.callsFake(function() {
      //   this.onload({target: {result: files[0]}});
      // });

      const footer = wrapper.find(EditorFooter);
      footer.find('input').simulate('change', {target: {files}});

      expect(spy.calledTwice).to.equal(true);
      expect(spy.withArgs(files[0]).calledWith(files[1])).to.equal(true);
    });
  });
});

