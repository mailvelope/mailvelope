import React from 'react';
import {render, screen, act, expect, sinon, waitFor, userEvent} from 'test';
import * as l10n from 'lib/l10n';
import ActionMenuWrapper from 'components/action-menu/components/ActionMenuWrapper';
import {createMockPort} from '../../../utils';

describe('ActionMenuWrapper tests', () => {
  const sandbox = sinon.createSandbox();

  const setup = (portResponses = {}) => {
    const defaultResponses = {'get-is-setup-done': {isSetupDone: true}};
    const finalResponses = {...defaultResponses, ...portResponses};
    createMockPort(sandbox, finalResponses);

    const ref = React.createRef();
    const rtlUtils = render(<ActionMenuWrapper ref={ref} />);
    return {ref, ...rtlUtils};
  };

  before(() => {
    l10n.mapToLocal();
  });

  beforeEach(() => {
    sandbox.stub(window, 'close');
  });

  afterEach(async () => {
    // Wait for any pending async operations to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    sandbox.restore();
  });

  it('should render', () => {
    const {container} = setup();
    expect(container.querySelector('.action-menu')).to.exist;
    expect(container.querySelector('.action-menu-wrapper')).to.exist;
  });

  describe('Unit tests', () => {
    describe('constructor', () => {
      it('should initialize with default state', () => {
        const {ref} = setup();
        expect(ref.current.state.isSetupDone).to.be.true;
        expect(ref.current.port).to.exist;
      });
    });

    describe('init', () => {
      it('should fetch setup status and update state', async () => {
        const {ref} = setup({'get-is-setup-done': {isSetupDone: false}});

        await waitFor(() => {
          expect(ref.current.port._events.send).to.include('get-is-setup-done');
        });

        expect(ref.current.state.isSetupDone).to.be.false;
      });

      it('should handle setup done state', async () => {
        const {ref} = setup({'get-is-setup-done': {isSetupDone: true}});

        await waitFor(() => {
          expect(ref.current.port._events.send).to.include('get-is-setup-done');
        });

        expect(ref.current.state.isSetupDone).to.be.true;
      });
    });

    describe('onMenuItemClick', () => {
      it('should emit browser-action for valid menu item', () => {
        const {ref} = setup();
        const mockEvent = {
          currentTarget: {id: 'dashboard'}
        };

        ref.current.onMenuItemClick(mockEvent);

        expect(ref.current.port._events.emit).to.include('browser-action');
        expect(window.close.calledOnce).to.be.true;
      });

      it('should not emit browser-action for empty ID', () => {
        const {ref} = setup();
        const mockEvent = {
          currentTarget: {id: ''}
        };

        const result = ref.current.onMenuItemClick(mockEvent);

        expect(result).to.be.false;
        expect(ref.current.port._events.emit).to.not.include('browser-action');
        expect(window.close.called).to.be.false;
      });

      it('should not emit browser-action for missing currentTarget', () => {
        const {ref} = setup();
        const mockEvent = {
          currentTarget: ''
        };

        const result = ref.current.onMenuItemClick(mockEvent);

        expect(result).to.be.false;
        expect(ref.current.port._events.emit).to.not.include('browser-action');
        expect(window.close.called).to.be.false;
      });
    });

    describe('hide', () => {
      it('should close window', () => {
        const {ref} = setup();

        ref.current.hide();

        expect(window.close.calledOnce).to.be.true;
      });
    });
  });

  describe('Integration tests', () => {
    describe('setup not done state', () => {
      it('should render ActionMenuSetup when setup not done', async () => {
        setup({'get-is-setup-done': {isSetupDone: false}});

        await waitFor(() => {
          expect(screen.getByRole('button', {name: /action_menu_setup_start_label/})).to.exist;
        });

        expect(screen.queryByRole('menuitem', {name: /action_menu_dashboard_label/})).to.not.exist;
      });

      it('should apply setup CSS class when setup not done', async () => {
        const {container} = setup({'get-is-setup-done': {isSetupDone: false}});

        await waitFor(() => {
          expect(container.querySelector('.action-menu-setup')).to.exist;
        });
      });

      it('should handle setup button click', async () => {
        const user = userEvent.setup();
        const {ref} = setup({'get-is-setup-done': {isSetupDone: false}});

        await waitFor(() => {
          expect(screen.getByRole('button', {name: /action_menu_setup_start_label/})).to.exist;
        });

        const setupButton = screen.getByRole('button', {name: /action_menu_setup_start_label/});

        await act(async () => {
          await user.click(setupButton);
        });

        expect(ref.current.port._events.emit).to.include('browser-action');
        expect(window.close.calledOnce).to.be.true;
      });

      it('should not show options link when setup not done', async () => {
        setup({'get-is-setup-done': {isSetupDone: false}});

        await waitFor(() => {
          expect(screen.getByRole('button', {name: /action_menu_setup_start_label/})).to.exist;
        });

        expect(screen.queryByTitle(l10n.map.action_menu_all_options)).to.not.exist;
      });
    });

    describe('setup done state', () => {
      it('should render ActionMenuBase when setup done', async () => {
        setup({'get-is-setup-done': {isSetupDone: true}});

        await waitFor(() => {
          expect(screen.getByRole('menuitem', {name: /action_menu_dashboard_label/})).to.exist;
        });

        expect(screen.queryByRole('button', {name: /action_menu_setup_start_label/})).to.not.exist;
      });

      it('should not apply setup CSS class when setup done', async () => {
        const {container} = setup({'get-is-setup-done': {isSetupDone: true}});

        await waitFor(() => {
          expect(screen.getByRole('menuitem', {name: /action_menu_dashboard_label/})).to.exist;
        });

        expect(container.querySelector('.action-menu-setup')).to.not.exist;
      });

      it('should show options link when setup done', async () => {
        setup({'get-is-setup-done': {isSetupDone: true}});

        await waitFor(() => {
          expect(screen.getByRole('menuitem', {name: /action_menu_dashboard_label/})).to.exist;
        });

        expect(screen.getByTitle(l10n.map.action_menu_all_options)).to.exist;
      });
    });

    describe('menu item interactions', () => {
      it('should handle dashboard menu item click', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        await waitFor(() => {
          expect(screen.getByRole('menuitem', {name: /action_menu_dashboard_label/})).to.exist;
        });

        const dashboardItem = screen.getByRole('menuitem', {name: /action_menu_dashboard_label/});

        await act(async () => {
          await user.click(dashboardItem);
        });

        expect(ref.current.port._events.emit).to.include('browser-action');
        expect(window.close.calledOnce).to.be.true;
      });

      it('should handle manage keys menu item click', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        await waitFor(() => {
          expect(screen.getByRole('menuitem', {name: /action_menu_keyring_label/})).to.exist;
        });

        const manageKeysItem = screen.getByRole('menuitem', {name: /action_menu_keyring_label/});

        await act(async () => {
          await user.click(manageKeysItem);
        });

        expect(ref.current.port._events.emit).to.include('browser-action');
        expect(window.close.calledOnce).to.be.true;
      });

      it('should handle encrypt file menu item click', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        await waitFor(() => {
          expect(screen.getByRole('menuitem', {name: /action_menu_file_encryption_label/})).to.exist;
        });

        const encryptFileItem = screen.getByRole('menuitem', {name: /action_menu_file_encryption_label/});

        await act(async () => {
          await user.click(encryptFileItem);
        });

        expect(ref.current.port._events.emit).to.include('browser-action');
        expect(window.close.calledOnce).to.be.true;
      });

      it('should handle security logs menu item click', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        await waitFor(() => {
          expect(screen.getByRole('menuitem', {name: /action_menu_review_security_logs_label/})).to.exist;
        });

        const securityLogsItem = screen.getByRole('menuitem', {name: /action_menu_review_security_logs_label/});

        await act(async () => {
          await user.click(securityLogsItem);
        });

        expect(ref.current.port._events.emit).to.include('browser-action');
        expect(window.close.calledOnce).to.be.true;
      });
    });

    describe('footer button interactions', () => {
      it('should handle reload extension button click', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        await waitFor(() => {
          expect(screen.getByRole('button', {name: /action_menu_reload_extension_scripts/})).to.exist;
        });

        const reloadButton = screen.getByRole('button', {name: /action_menu_reload_extension_scripts/});

        await act(async () => {
          await user.click(reloadButton);
        });

        expect(ref.current.port._events.emit).to.include('browser-action');
        expect(window.close.calledOnce).to.be.true;
      });

      it('should handle activate tab button click', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        await waitFor(() => {
          expect(screen.getByRole('button', {name: /action_menu_activate_current_tab/})).to.exist;
        });

        const activateTabButton = screen.getByRole('button', {name: /action_menu_activate_current_tab/});

        await act(async () => {
          await user.click(activateTabButton);
        });

        expect(ref.current.port._events.emit).to.include('browser-action');
        expect(window.close.calledOnce).to.be.true;
      });
    });

    describe('navigation interactions', () => {
      it('should handle options link click', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        await waitFor(() => {
          expect(screen.getByTitle(l10n.map.action_menu_all_options)).to.exist;
        });

        const optionsLink = screen.getByTitle(l10n.map.action_menu_all_options);

        await act(async () => {
          await user.click(optionsLink);
        });

        expect(ref.current.port._events.emit).to.include('browser-action');
        expect(window.close.calledOnce).to.be.true;
      });

      it('should render help link with correct href', async () => {
        setup();

        await waitFor(() => {
          expect(screen.getByTitle(l10n.map.action_menu_help)).to.exist;
        });

        const helpLink = screen.getByTitle(l10n.map.action_menu_help);
        expect(helpLink).to.have.attribute('href', 'https://www.mailvelope.com/faq');
        expect(helpLink).to.have.attribute('target', '_blank');
      });
    });

    describe('component structure', () => {
      it('should render action menu header with logo', async () => {
        const {container} = setup();

        await waitFor(() => {
          expect(container.querySelector('.action-menu-header')).to.exist;
        });

        const logo = container.querySelector('img[alt=""]');
        expect(logo).to.exist;
        expect(logo).to.have.attribute('src', '../../img/Mailvelope/logo.svg');
      });

      it('should render all main sections', async () => {
        const {container} = setup();

        await waitFor(() => {
          expect(container.querySelector('.action-menu-wrapper')).to.exist;
        });

        expect(container.querySelector('.action-menu-header')).to.exist;
        expect(container.querySelector('.action-menu-content')).to.exist;
        expect(container.querySelector('.action-menu-footer')).to.exist;
      });
    });
  });

  describe('Error states', () => {
    it('should handle port communication errors gracefully', async () => {
      // Create a failing mock port using enhanced createMockPort
      createMockPort(sandbox, {}, {shouldFail: true, errorMessage: 'Connection failed'});

      const ref = React.createRef();

      // Component should render even if port communication fails
      let component;
      expect(() => {
        component = render(<ActionMenuWrapper ref={ref} />);
      }).to.not.throw();

      expect(component.container.querySelector('.action-menu')).to.exist;
      expect(ref.current.state.isSetupDone).to.be.true; // Default state maintained
    });

    it('should handle specific event failures', async () => {
      // Only make get-is-setup-done fail, other operations should work
      createMockPort(sandbox, {}, {
        failingEvents: ['get-is-setup-done'],
        errorMessage: 'Setup check failed'
      });

      const ref = React.createRef();
      render(<ActionMenuWrapper ref={ref} />);

      // Component should still render with default state
      expect(ref.current.state.isSetupDone).to.be.true;
      expect(ref.current.port._events.send).to.include('get-is-setup-done');
    });

    it('should handle missing port response', async () => {
      // When response is undefined, the mock returns the event name itself
      // Let's test with a null response instead
      const {ref} = setup({'get-is-setup-done': null});

      await waitFor(() => {
        expect(ref.current.port._events.send).to.include('get-is-setup-done');
      });

      // Should handle null response gracefully
      expect(ref.current.state.isSetupDone).to.be.true;
    });

    it('should handle malformed port response', async () => {
      const {ref} = setup({'get-is-setup-done': 'invalid-response'});

      await waitFor(() => {
        expect(ref.current.port._events.send).to.include('get-is-setup-done');
      });

      // Should handle gracefully when response doesn't have expected structure
      expect(ref.current.state).to.exist;
    });
  });
});
