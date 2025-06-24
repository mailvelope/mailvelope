import React from 'react';
import {render, screen, act, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as l10n from 'lib/l10n';
import ActionMenuWrapper from 'components/action-menu/components/ActionMenuWrapper';

jest.mock('../../../../../src/lib/EventHandler', () => require('../../../../__mocks__/lib/EventHandler').default);

describe('ActionMenuWrapper tests', () => {
  const setup = (portResponses = {}, portOptions = {}) => {
    const defaultResponses = {'get-is-setup-done': {isSetupDone: true}};
    const finalResponses = {...defaultResponses, ...portResponses};

    // Configure mock responses BEFORE rendering
    const MockEventHandler = require('../../../../__mocks__/lib/EventHandler').default;
    MockEventHandler.setMockResponses(finalResponses, portOptions);

    const ref = React.createRef();
    const rtlUtils = render(<ActionMenuWrapper ref={ref} />);

    return {ref, ...rtlUtils};
  };

  beforeAll(() => {
    l10n.mapToLocal();
  });

  beforeEach(() => {
    jest.spyOn(window, 'close').mockImplementation(() => {});
  });

  afterEach(() => {
    const MockEventHandler = require('../../../../__mocks__/lib/EventHandler').default;
    MockEventHandler.clearMockResponses();
  });

  it('should render', () => {
    const {container} = setup();
    expect(container.querySelector('.action-menu')).toBeInTheDocument();
    expect(container.querySelector('.action-menu-wrapper')).toBeInTheDocument();
  });

  describe('Unit tests', () => {
    describe('constructor', () => {
      it('should initialize with default state', () => {
        const {ref} = setup();
        expect(ref.current.state.isSetupDone).toBe(true);
        expect(ref.current.port).toBeTruthy();
      });
    });

    describe('init', () => {
      it('should fetch setup status and update state', async () => {
        const {ref} = setup({'get-is-setup-done': {isSetupDone: false}});

        await waitFor(() => {
          expect(ref.current.port._events.send).toContain('get-is-setup-done');
        });

        expect(ref.current.state.isSetupDone).toBe(false);
      });

      it('should handle setup done state', async () => {
        const {ref} = setup({'get-is-setup-done': {isSetupDone: true}});

        await waitFor(() => {
          expect(ref.current.port._events.send).toContain('get-is-setup-done');
        });

        expect(ref.current.state.isSetupDone).toBe(true);
      });
    });

    describe('onMenuItemClick', () => {
      it('should emit browser-action for valid menu item', () => {
        const {ref} = setup();
        const mockEvent = {
          currentTarget: {id: 'dashboard'}
        };

        ref.current.onMenuItemClick(mockEvent);

        expect(ref.current.port._events.emit).toContain('browser-action');
        expect(window.close).toHaveBeenCalledTimes(1);
      });

      it('should not emit browser-action for empty ID', () => {
        const {ref} = setup();
        const mockEvent = {
          currentTarget: {id: ''}
        };

        const result = ref.current.onMenuItemClick(mockEvent);

        expect(result).toBe(false);
        expect(ref.current.port._events.emit).not.toContain('browser-action');
        expect(window.close).not.toHaveBeenCalled();
      });

      it('should not emit browser-action for missing currentTarget', () => {
        const {ref} = setup();
        const mockEvent = {
          currentTarget: ''
        };

        const result = ref.current.onMenuItemClick(mockEvent);

        expect(result).toBe(false);
        expect(ref.current.port._events.emit).not.toContain('browser-action');
        expect(window.close).not.toHaveBeenCalled();
      });
    });

    describe('hide', () => {
      it('should close window', () => {
        const {ref} = setup();

        ref.current.hide();

        expect(window.close).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Integration tests', () => {
    describe('setup not done state', () => {
      it('should render ActionMenuSetup when setup not done', async () => {
        setup({'get-is-setup-done': {isSetupDone: false}});

        await waitFor(() => {
          expect(screen.getByRole('button', {name: /action_menu_setup_start_label/})).toBeInTheDocument();
        });

        expect(screen.queryByRole('menuitem', {name: /action_menu_dashboard_label/})).not.toBeInTheDocument();
      });

      it('should apply setup CSS class when setup not done', async () => {
        const {container} = setup({'get-is-setup-done': {isSetupDone: false}});

        await waitFor(() => {
          expect(container.querySelector('.action-menu-setup')).toBeInTheDocument();
        });
      });

      it('should handle setup button click', async () => {
        const user = userEvent.setup();
        const {ref} = setup({'get-is-setup-done': {isSetupDone: false}});

        await waitFor(() => {
          expect(screen.getByRole('button', {name: /action_menu_setup_start_label/})).toBeInTheDocument();
        });

        const setupButton = screen.getByRole('button', {name: /action_menu_setup_start_label/});

        await act(async () => {
          await user.click(setupButton);
        });

        expect(ref.current.port._events.emit).toContain('browser-action');
        expect(window.close).toHaveBeenCalledTimes(1);
      });

      it('should not show options link when setup not done', async () => {
        setup({'get-is-setup-done': {isSetupDone: false}});

        await waitFor(() => {
          expect(screen.getByRole('button', {name: /action_menu_setup_start_label/})).toBeInTheDocument();
        });

        expect(screen.queryByTitle(l10n.map.action_menu_all_options)).not.toBeInTheDocument();
      });
    });

    describe('setup done state', () => {
      it('should render ActionMenuBase when setup done', async () => {
        setup({'get-is-setup-done': {isSetupDone: true}});

        await waitFor(() => {
          expect(screen.getByRole('menuitem', {name: /action_menu_dashboard_label/})).toBeInTheDocument();
        });

        expect(screen.queryByRole('button', {name: /action_menu_setup_start_label/})).not.toBeInTheDocument();
      });

      it('should not apply setup CSS class when setup done', async () => {
        const {container} = setup({'get-is-setup-done': {isSetupDone: true}});

        await waitFor(() => {
          expect(screen.getByRole('menuitem', {name: /action_menu_dashboard_label/})).toBeInTheDocument();
        });

        expect(container.querySelector('.action-menu-setup')).not.toBeInTheDocument();
      });

      it('should show options link when setup done', async () => {
        setup({'get-is-setup-done': {isSetupDone: true}});

        await waitFor(() => {
          expect(screen.getByRole('menuitem', {name: /action_menu_dashboard_label/})).toBeInTheDocument();
        });

        expect(screen.getByTitle(l10n.map.action_menu_all_options)).toBeInTheDocument();
      });
    });

    describe('menu item interactions', () => {
      it('should handle dashboard menu item click', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        await waitFor(() => {
          expect(screen.getByRole('menuitem', {name: /action_menu_dashboard_label/})).toBeInTheDocument();
        });

        const dashboardItem = screen.getByRole('menuitem', {name: /action_menu_dashboard_label/});

        await act(async () => {
          await user.click(dashboardItem);
        });

        expect(ref.current.port._events.emit).toContain('browser-action');
        expect(window.close).toHaveBeenCalledTimes(1);
      });

      it('should handle manage keys menu item click', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        await waitFor(() => {
          expect(screen.getByRole('menuitem', {name: /action_menu_keyring_label/})).toBeInTheDocument();
        });

        const manageKeysItem = screen.getByRole('menuitem', {name: /action_menu_keyring_label/});

        await act(async () => {
          await user.click(manageKeysItem);
        });

        expect(ref.current.port._events.emit).toContain('browser-action');
        expect(window.close).toHaveBeenCalledTimes(1);
      });

      it('should handle encrypt file menu item click', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        await waitFor(() => {
          expect(screen.getByRole('menuitem', {name: /action_menu_file_encryption_label/})).toBeInTheDocument();
        });

        const encryptFileItem = screen.getByRole('menuitem', {name: /action_menu_file_encryption_label/});

        await act(async () => {
          await user.click(encryptFileItem);
        });

        expect(ref.current.port._events.emit).toContain('browser-action');
        expect(window.close).toHaveBeenCalledTimes(1);
      });

      it('should handle security logs menu item click', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        await waitFor(() => {
          expect(screen.getByRole('menuitem', {name: /action_menu_review_security_logs_label/})).toBeInTheDocument();
        });

        const securityLogsItem = screen.getByRole('menuitem', {name: /action_menu_review_security_logs_label/});

        await act(async () => {
          await user.click(securityLogsItem);
        });

        expect(ref.current.port._events.emit).toContain('browser-action');
        expect(window.close).toHaveBeenCalledTimes(1);
      });
    });

    describe('footer button interactions', () => {
      it('should handle reload extension button click', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        await waitFor(() => {
          expect(screen.getByRole('button', {name: /action_menu_reload_extension_scripts/})).toBeInTheDocument();
        });

        const reloadButton = screen.getByRole('button', {name: /action_menu_reload_extension_scripts/});

        await act(async () => {
          await user.click(reloadButton);
        });

        expect(ref.current.port._events.emit).toContain('browser-action');
        expect(window.close).toHaveBeenCalledTimes(1);
      });

      it('should handle activate tab button click', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        await waitFor(() => {
          expect(screen.getByRole('button', {name: /action_menu_activate_current_tab/})).toBeInTheDocument();
        });

        const activateTabButton = screen.getByRole('button', {name: /action_menu_activate_current_tab/});

        await act(async () => {
          await user.click(activateTabButton);
        });

        expect(ref.current.port._events.emit).toContain('browser-action');
        expect(window.close).toHaveBeenCalledTimes(1);
      });
    });

    describe('navigation interactions', () => {
      it('should handle options link click', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        await waitFor(() => {
          expect(screen.getByTitle(l10n.map.action_menu_all_options)).toBeInTheDocument();
        });

        const optionsLink = screen.getByTitle(l10n.map.action_menu_all_options);

        await act(async () => {
          await user.click(optionsLink);
        });

        expect(ref.current.port._events.emit).toContain('browser-action');
        expect(window.close).toHaveBeenCalledTimes(1);
      });

      it('should render help link with correct href', async () => {
        setup();

        await waitFor(() => {
          expect(screen.getByTitle(l10n.map.action_menu_help)).toBeInTheDocument();
        });

        const helpLink = screen.getByTitle(l10n.map.action_menu_help);
        expect(helpLink).toHaveAttribute('href', 'https://www.mailvelope.com/faq');
        expect(helpLink).toHaveAttribute('target', '_blank');
      });
    });

    describe('component structure', () => {
      it('should render action menu header with logo', async () => {
        const {container} = setup();

        await waitFor(() => {
          expect(container.querySelector('.action-menu-header')).toBeInTheDocument();
        });

        const logo = container.querySelector('img[alt=""]');
        expect(logo).toBeInTheDocument();
        expect(logo).toHaveAttribute('src', '../../img/Mailvelope/logo.svg');
      });

      it('should render all main sections', async () => {
        const {container} = setup();

        await waitFor(() => {
          expect(container.querySelector('.action-menu-wrapper')).toBeInTheDocument();
        });

        expect(container.querySelector('.action-menu-header')).toBeInTheDocument();
        expect(container.querySelector('.action-menu-content')).toBeInTheDocument();
        expect(container.querySelector('.action-menu-footer')).toBeInTheDocument();
      });
    });
  });

  describe('Error states', () => {
    it('should render with default state when port is unavailable', async () => {
      // Test with a port that returns undefined (simulates unavailable port)
      const {ref, container} = setup({'get-is-setup-done': undefined});

      expect(container.querySelector('.action-menu')).toBeInTheDocument();
      expect(ref.current.state.isSetupDone).toBe(true); // Default state maintained
    });

    it('should handle missing port response', async () => {
      // Test with empty object response (simulates missing isSetupDone property)
      const {ref} = setup({'get-is-setup-done': {}});

      await waitFor(() => {
        expect(ref.current.port._events.send).toContain('get-is-setup-done');
      });

      // Should handle missing isSetupDone property (destructuring undefined results in undefined state)
      expect(ref.current.state.isSetupDone).toBeUndefined();
    });

    it('should handle malformed port response', async () => {
      const {ref} = setup({'get-is-setup-done': 'invalid-response'});

      await waitFor(() => {
        expect(ref.current.port._events.send).toContain('get-is-setup-done');
      });

      // Should handle gracefully when response doesn't have expected structure
      expect(ref.current.state).toBeTruthy();
    });
  });
});
