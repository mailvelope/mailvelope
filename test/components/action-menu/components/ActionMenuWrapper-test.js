import React from 'react';
import {render, screen, fireEvent, waitFor, expect, sinon, act} from 'test';
import ActionMenuWrapper from 'components/action-menu/components/ActionMenuWrapper';
import {createMockPort} from '../../../utils';

describe('Action Menu tests', () => {
  const sandbox = sinon.createSandbox();

  const setup = () => {
    const ref = React.createRef();
    const rtlUtils = render(<ActionMenuWrapper ref={ref} />);
    return {
      ref,
      ...rtlUtils,
    };
  };

  beforeEach(() => {
    // Configure specific response for the get-is-setup-done event
    createMockPort(sandbox, {'get-is-setup-done': {isSetupDone: true}});
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should render', () => {
    const {container} = setup();
    expect(container.querySelector('.action-menu')).to.exist;
  });

  describe('Do some integration tests', () => {
    describe('Base Menu', () => {
      it('should emit browser action on click', async () => {
        const spy = sandbox.spy(ActionMenuWrapper.prototype, 'onMenuItemClick');
        const {ref} = setup();
        await waitFor(() => {
          expect(ref.current.port._events.send).to.include('get-is-setup-done');
        });
        const manageKeys = screen.getByRole('menuitem', {name: /action_menu_keyring_label/i});
        await act(() => {
          fireEvent.click(manageKeys);
        });
        expect(spy.calledOnce).to.be.true;
        expect(ref.current.port._events.emit).to.include('browser-action');
      });
    });
  });
});
