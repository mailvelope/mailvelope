
import React from 'react';
import {expect, sinon, mount} from 'test';
import EventHandler from 'lib/EventHandler';
import * as l10n from 'lib/l10n';
import Spinner from 'components/util/Spinner';
import Alert from 'components/util/Alert';
import EncryptedForm from 'components/encrypted-form/encryptedForm';

l10n.mapToLocal();

describe('Encrypt Form tests', () => {
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
      id: 'encrypted-form-test',
      ...propOverrides
    };

    const wrapper = mount(<EncryptedForm {...props} />);

    return {
      props,
      wrapper,
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

  describe('Do some integration tests', () => {
    it('should initialize the component and should wait on the form definition event', () => {
      const {wrapper} = setup();
      const component = wrapper.instance();
      expect(component.port._events.on).to.include.members(['encrypted-form-definition', 'error-message',
        'terminate', 'encrypted-form-submit', 'encrypted-form-submit-cancel']);
      expect(component.port._events.emit).to.include.members(['encrypted-form-init']);
      expect(wrapper.find(Spinner).exists()).to.equal(true);
    });

    it('should show the sandbox form component and the form materials', done  => {
      const {wrapper} = setup();
      const component = wrapper.instance();
      const event = {
        formDefinition: '<form class="needs-validation" data-recipient="test@mailvelope.com" data-action="https://demo.mailvelope.com/form/"><div class="form-group"><label for="validationCustomSimple">How are you?</label><div class="input-group"><input class="form-control" value="cofveve" name="validationCustomSimple" required="" type="text" id="validationCustomSimple"><div class="invalid-feedback">Please say something?</div></div></div></form>',
        formEncoding: 'html',
        formAction: null,
        formRecipient: 'test@mailvelope.com',
        recipientFpr: 'AA1E 0177 4BDF 7D76 A45B DC2D F11D B125 0C3C 3F1B'
      };
      component.showForm(event);
      setTimeout(() => {
        wrapper.update();
        expect(wrapper.find('iframe#formSandbox').exists()).to.equal(true);
        expect(wrapper.find('.formWrapper').exists()).to.equal(true);
        expect(wrapper.find('button.btn').exists()).to.equal(true);
        done();
      }, 300);
    });
    it('should show error message on error-message event', done => {
      const {wrapper} = setup();
      const component = wrapper.instance();
      const error = {
        message: 'Error message!'
      };
      component.showErrorMsg(error);
      setTimeout(() => {
        wrapper.update();
        const alert = wrapper.find(Alert);
        expect(alert.exists()).to.equal(true);
        expect(alert.text()).to.equal(error.message);
        done();
      }, 300);
    });
  });
});
