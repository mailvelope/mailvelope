
import React from 'react';
import {expect, sinon, mount} from 'test';
import EventHandler from 'lib/EventHandler';
import ActionMenuBase from 'components/action-menu/components/ActionMenuBase';
import ActionMenuWrapper from 'components/action-menu/components/ActionMenuWrapper';

// disable all jquery animations
$.fx.off = true;

describe('Action Menu tests', () => {
  const sandbox = sinon.createSandbox();
  let testElem;

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
      ...propOverrides
    };

    const wrapper = mount(<ActionMenuWrapper {...props} />, {attachTo: document.getElementById('app')});
    return {
      props,
      wrapper,
    };
  };

  beforeEach(() => {
    testElem = $('<div id="app"></div>');
    $(document.body).append(testElem);
    mockPort();
  });

  afterEach(() => {
    sandbox.restore();
    testElem.remove();
  });

  it('should render', () => {
    const {wrapper} = setup();
    expect(wrapper.exists()).to.equal(true);
  });

  describe('Do some integration tests', () => {
    describe('Base Menu', () => {
      it('should emit browser action on click', () => {
        const spy = sandbox.spy(ActionMenuWrapper.prototype, 'onMenuItemClick');
        const {wrapper} = setup();
        const component = wrapper.instance();
        expect(component.port._events.send).to.include.members(['get-is-setup-done']);

        const actionMenuBase = wrapper.find(ActionMenuBase);
        actionMenuBase.find('a#manage-keys').simulate('click');

        expect(spy.calledOnce).to.equal(true);
        expect(spy.getCall(0).args[0].target.id).to.equal('manage-keys');
        expect(component.port._events.emit).to.include.members(['browser-action']);
      });
    });
  });
});
