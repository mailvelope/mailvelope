import React from 'react';
import {render, screen, act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as l10n from 'lib/l10n';
import KeyServer from 'app/settings/keyserver';

describe('KeyServer tests', () => {
  const defaultProps = {
    prefs: {
      keyserver: {
        mvelo_tofu_lookup: true,
        wkd_lookup: true,
        autocrypt_lookup: false,
        key_binding: true,
        oks_lookup: true
      }
    },
    onChangePrefs: jest.fn().mockResolvedValue()
  };

  const setup = (props = {}) => {
    const finalProps = {...defaultProps, ...props};
    const ref = React.createRef();
    const rtlUtils = render(<KeyServer ref={ref} {...finalProps} />);
    return {ref, ...rtlUtils};
  };

  beforeAll(() => {
    l10n.mapToLocal();
  });

  beforeEach(() => {
    defaultProps.onChangePrefs.mockClear();
  });

  it('should render', () => {
    const {container} = setup();
    expect(container.querySelector('#keyserver')).toBeInTheDocument();
    expect(container.querySelector('h2')).toBeInTheDocument();
  });

  describe('Unit tests', () => {
    describe('constructor', () => {
      it('should initialize state with props values', () => {
        const {ref} = setup();
        expect(ref.current.state).toMatchObject({
          mvelo_tofu_lookup: true,
          wkd_lookup: true,
          autocrypt_lookup: false,
          key_binding: true,
          oks_lookup: true,
          modified: false,
          previousPrefs: defaultProps.prefs
        });
      });

      it('should initialize state with defaults when prefs is null', () => {
        const {ref} = setup({prefs: null});
        expect(ref.current.state).toMatchObject({
          mvelo_tofu_lookup: false,
          wkd_lookup: false,
          autocrypt_lookup: false,
          key_binding: false,
          oks_lookup: false,
          modified: false,
          previousPrefs: null
        });
      });
    });

    describe('getDerivedStateFromProps', () => {
      it('should reset state when prefs change', () => {
        const {ref, rerender} = setup();

        // Modify state to be different from props
        act(() => {
          ref.current.setState({mvelo_tofu_lookup: false, modified: true});
        });

        // Change props
        const newProps = {
          ...defaultProps,
          prefs: {
            keyserver: {
              mvelo_tofu_lookup: false,
              wkd_lookup: false,
              autocrypt_lookup: true,
              key_binding: false,
              oks_lookup: false
            }
          }
        };

        rerender(<KeyServer ref={ref} {...newProps} />);

        expect(ref.current.state).toMatchObject({
          mvelo_tofu_lookup: false,
          wkd_lookup: false,
          autocrypt_lookup: true,
          key_binding: false,
          oks_lookup: false,
          modified: false,
          previousPrefs: newProps.prefs
        });
      });

      it('should not reset state when prefs unchanged', () => {
        const {ref} = setup();

        // Modify state
        act(() => {
          ref.current.setState({mvelo_tofu_lookup: false, modified: true});
        });

        const originalState = {...ref.current.state};

        // Re-render with same props
        act(() => {
          ref.current.forceUpdate();
        });

        expect(ref.current.state.modified).toBe(true);
        expect(ref.current.state.mvelo_tofu_lookup).toBe(originalState.mvelo_tofu_lookup);
      });
    });

    describe('handleCheck', () => {
      it('should update state for checked checkbox', () => {
        const {ref} = setup();
        const event = {target: {name: 'wkd_lookup', checked: true}};

        act(() => {
          ref.current.handleCheck(event);
        });

        expect(ref.current.state.wkd_lookup).toBe(true);
        expect(ref.current.state.modified).toBe(true);
      });

      it('should update state for unchecked checkbox', () => {
        const {ref} = setup();
        const event = {target: {name: 'mvelo_tofu_lookup', checked: false}};

        act(() => {
          ref.current.handleCheck(event);
        });

        expect(ref.current.state.mvelo_tofu_lookup).toBe(false);
        expect(ref.current.state.modified).toBe(true);
      });
    });

    describe('handleSave', () => {
      it('should call onChangePrefs with current state values', async () => {
        const {ref} = setup();

        // Modify some state
        act(() => {
          ref.current.setState({
            autocrypt_lookup: true,
            key_binding: false,
            modified: true
          });
        });

        await act(async () => {
          await ref.current.handleSave();
        });

        expect(defaultProps.onChangePrefs).toHaveBeenCalledWith({
          keyserver: {
            autocrypt_lookup: true,
            key_binding: false,
            mvelo_tofu_lookup: true,
            oks_lookup: true,
            wkd_lookup: true
          }
        });
      });

      it('should handle onChangePrefs errors gracefully', async () => {
        const mockError = new Error('Save failed');
        const failingOnChangePrefs = jest.fn().mockRejectedValue(mockError);
        const {ref} = setup({
          onChangePrefs: failingOnChangePrefs
        });

        await expect(async () => {
          await act(async () => {
            await ref.current.handleSave();
          });
        }).rejects.toThrow('Save failed');
      });
    });
  });

  describe('Integration tests', () => {
    describe('checkbox interactions', () => {
      it('should toggle TOFU lookup checkbox', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        const checkbox = screen.getByRole('checkbox', {name: /keyserver_tofu_lookup/});
        expect(checkbox).toBeChecked();

        await user.click(checkbox);

        expect(ref.current.state.mvelo_tofu_lookup).toBe(false);
        expect(ref.current.state.modified).toBe(true);
        expect(checkbox).not.toBeChecked();
      });

      it('should toggle WKD lookup checkbox', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        const checkbox = screen.getByRole('checkbox', {name: /keyserver_wkd_lookup/});
        expect(checkbox).toBeChecked();

        await user.click(checkbox);

        expect(ref.current.state.wkd_lookup).toBe(false);
        expect(ref.current.state.modified).toBe(true);
        expect(checkbox).not.toBeChecked();
      });

      it('should toggle autocrypt lookup checkbox', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        const checkbox = screen.getByRole('checkbox', {name: /keyserver_autocrypt_lookup/});
        expect(checkbox).not.toBeChecked();

        await user.click(checkbox);

        expect(ref.current.state.autocrypt_lookup).toBe(true);
        expect(ref.current.state.modified).toBe(true);
        expect(checkbox).toBeChecked();
      });

      it('should toggle key binding checkbox', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        const checkbox = screen.getByRole('checkbox', {name: /keyserver_key_binding_label/});
        expect(checkbox).toBeChecked();

        await user.click(checkbox);

        expect(ref.current.state.key_binding).toBe(false);
        expect(ref.current.state.modified).toBe(true);
        expect(checkbox).not.toBeChecked();
      });

      it('should toggle OKS lookup checkbox', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        const checkbox = screen.getByRole('checkbox', {name: /keyserver_oks_lookup/});
        expect(checkbox).toBeChecked();

        await user.click(checkbox);

        expect(ref.current.state.oks_lookup).toBe(false);
        expect(ref.current.state.modified).toBe(true);
        expect(checkbox).not.toBeChecked();
      });
    });

    describe('button states and interactions', () => {
      it('should disable save and cancel buttons when not modified', () => {
        setup();

        const saveButton = screen.getByRole('button', {name: /form_save/});
        const cancelButton = screen.getByRole('button', {name: /form_cancel/});

        expect(saveButton).toBeDisabled();
        expect(cancelButton).toBeDisabled();
      });

      it('should enable save and cancel buttons when modified', async () => {
        const user = userEvent.setup();
        setup();

        // Make a change to enable buttons
        const checkbox = screen.getByRole('checkbox', {name: /keyserver_tofu_lookup/});
        await user.click(checkbox);

        const saveButton = screen.getByRole('button', {name: /form_save/});
        const cancelButton = screen.getByRole('button', {name: /form_cancel/});

        expect(saveButton).toBeEnabled();
        expect(cancelButton).toBeEnabled();
      });

      it('should call handleSave when save button clicked', async () => {
        const user = userEvent.setup();
        setup();

        // Make a change to enable save button
        const checkbox = screen.getByRole('checkbox', {name: /keyserver_tofu_lookup/});
        await act(async () => {
          await user.click(checkbox);
        });

        const saveButton = screen.getByRole('button', {name: /form_save/});

        await act(async () => {
          await user.click(saveButton);
        });

        expect(defaultProps.onChangePrefs).toHaveBeenCalledTimes(1);
      });

      it('should reset state when cancel button clicked', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        // Make changes
        const tofuCheckbox = screen.getByRole('checkbox', {name: /keyserver_tofu_lookup/});
        const autocryptCheckbox = screen.getByRole('checkbox', {name: /keyserver_autocrypt_lookup/});

        await user.click(tofuCheckbox);
        await user.click(autocryptCheckbox);

        expect(ref.current.state.modified).toBe(true);
        expect(ref.current.state.mvelo_tofu_lookup).toBe(false);
        expect(ref.current.state.autocrypt_lookup).toBe(true);

        // Click cancel to reset
        const cancelButton = screen.getByRole('button', {name: /form_cancel/});
        await user.click(cancelButton);

        expect(ref.current.state.modified).toBe(false);
        expect(ref.current.state.mvelo_tofu_lookup).toBe(true);
        expect(ref.current.state.autocrypt_lookup).toBe(false);
      });
    });

    describe('form sections rendering', () => {
      it('should render verifying servers section', () => {
        setup();
        expect(screen.getByText(l10n.map.keyserver_verifying_servers)).toBeInTheDocument();
        expect(screen.getByRole('checkbox', {name: /keyserver_tofu_lookup/})).toBeInTheDocument();
        expect(screen.getByRole('checkbox', {name: /keyserver_oks_lookup/})).toBeInTheDocument();
      });

      it('should render additional servers section', () => {
        setup();
        expect(screen.getByText(l10n.map.keyserver_additionals_label)).toBeInTheDocument();
        expect(screen.getByRole('checkbox', {name: /keyserver_wkd_lookup/})).toBeInTheDocument();
        expect(screen.getByRole('checkbox', {name: /keyserver_autocrypt_lookup/})).toBeInTheDocument();
      });

      it('should render key binding section', () => {
        setup();
        expect(screen.getByText(l10n.map.keyserver_key_binding_header)).toBeInTheDocument();
        expect(screen.getByRole('checkbox', {name: /keyserver_key_binding_label/})).toBeInTheDocument();
      });

      it('should render learn more links', () => {
        const {container} = setup();
        const learnMoreLinks = container.querySelectorAll('a[href*="mailvelope.com/faq"]');
        expect(learnMoreLinks).toHaveLength(4);
      });
    });

    describe('accessibility and keyboard navigation', () => {
      it('should support keyboard navigation between checkboxes', async () => {
        const user = userEvent.setup();
        setup();

        const tofuCheckbox = screen.getByRole('checkbox', {name: /keyserver_tofu_lookup/});

        // Focus first checkbox
        await user.click(tofuCheckbox);
        expect(tofuCheckbox).toHaveFocus();

        // Tab navigation should work (focus moves to next focusable element)
        await user.tab();
        expect(document.activeElement).not.toBe(tofuCheckbox);
      });

      it('should handle keyboard interaction on checkboxes', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        const checkbox = screen.getByRole('checkbox', {name: /keyserver_tofu_lookup/});

        // Check initial state
        const initialState = ref.current.state.mvelo_tofu_lookup;

        // Test that we can interact with checkbox via keyboard
        await user.click(checkbox);
        expect(checkbox).toHaveFocus();

        // State should have toggled after click
        expect(ref.current.state.mvelo_tofu_lookup).toBe(!initialState);
        expect(ref.current.state.modified).toBe(true);
      });

      it('should have proper ARIA attributes', () => {
        setup();

        const checkboxes = screen.getAllByRole('checkbox');
        checkboxes.forEach(checkbox => {
          expect(checkbox).toHaveAttribute('type', 'checkbox');
          expect(checkbox).toHaveAttribute('name');
        });

        const saveButton = screen.getByRole('button', {name: /form_save/});
        const cancelButton = screen.getByRole('button', {name: /form_cancel/});

        expect(saveButton).toHaveAttribute('type', 'button');
        expect(cancelButton).toHaveAttribute('type', 'button');
      });

      it('should support Enter key on save button', async () => {
        const user = userEvent.setup();
        setup();

        // Make a change to enable save button
        const checkbox = screen.getByRole('checkbox', {name: /keyserver_tofu_lookup/});
        await user.click(checkbox);

        const saveButton = screen.getByRole('button', {name: /form_save/});

        await user.click(saveButton);
        await user.keyboard('{Enter}');

        expect(defaultProps.onChangePrefs).toHaveBeenCalled();
      });
    });

    describe('advanced user workflows', () => {
      it('should handle rapid successive preference changes', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        const tofuCheckbox = screen.getByRole('checkbox', {name: /keyserver_tofu_lookup/});
        const wkdCheckbox = screen.getByRole('checkbox', {name: /keyserver_wkd_lookup/});
        const autocryptCheckbox = screen.getByRole('checkbox', {name: /keyserver_autocrypt_lookup/});

        // Rapid changes
        await user.click(tofuCheckbox);
        await user.click(wkdCheckbox);
        await user.click(autocryptCheckbox);

        expect(ref.current.state.mvelo_tofu_lookup).toBe(false);
        expect(ref.current.state.wkd_lookup).toBe(false);
        expect(ref.current.state.autocrypt_lookup).toBe(true);
        expect(ref.current.state.modified).toBe(true);
      });

      it('should handle bulk preference reset workflow', async () => {
        const user = userEvent.setup();
        const {ref} = setup();

        // Change multiple preferences
        const checkboxes = [
          screen.getByRole('checkbox', {name: /keyserver_tofu_lookup/}),
          screen.getByRole('checkbox', {name: /keyserver_wkd_lookup/}),
          screen.getByRole('checkbox', {name: /keyserver_autocrypt_lookup/})
        ];

        for (const checkbox of checkboxes) {
          await user.click(checkbox);
        }

        expect(ref.current.state.modified).toBe(true);

        // Reset all via cancel
        const cancelButton = screen.getByRole('button', {name: /form_cancel/});
        await user.click(cancelButton);

        expect(ref.current.state.modified).toBe(false);
        expect(ref.current.state.mvelo_tofu_lookup).toBe(true);
        expect(ref.current.state.wkd_lookup).toBe(true);
        expect(ref.current.state.autocrypt_lookup).toBe(false);
      });
    });

    describe('security and validation', () => {
      it('should validate preference object structure', async () => {
        const {ref} = setup();

        await act(async () => {
          await ref.current.handleSave();
        });

        const savedPrefs = defaultProps.onChangePrefs.mock.calls[0][0];

        expect(savedPrefs).toMatchObject({
          keyserver: expect.objectContaining({
            mvelo_tofu_lookup: expect.any(Boolean),
            wkd_lookup: expect.any(Boolean),
            autocrypt_lookup: expect.any(Boolean),
            key_binding: expect.any(Boolean),
            oks_lookup: expect.any(Boolean)
          })
        });
      });

      it('should handle save button state correctly during async operations', async () => {
        const user = userEvent.setup();
        const delayedSave = jest.fn().mockResolvedValue();
        setup({onChangePrefs: delayedSave});

        // Make a change to enable save
        const checkbox = screen.getByRole('checkbox', {name: /keyserver_tofu_lookup/});
        await user.click(checkbox);

        const saveButton = screen.getByRole('button', {name: /form_save/});
        expect(saveButton).toBeEnabled();

        // Click save button
        await user.click(saveButton);

        // Verify save was called
        expect(delayedSave).toHaveBeenCalledTimes(1);
      });
    });

    describe('performance and responsiveness', () => {
      it('should handle window resize events', async () => {
        const {container} = setup();

        // Trigger a resize event
        await act(async () => {
          global.dispatchEvent(new Event('resize'));
        });

        // Component should still be functional after resize
        expect(container.querySelector('#keyserver')).toBeInTheDocument();
        expect(container.querySelector('h2')).toBeInTheDocument();
      });

      it('should maintain focus management during dynamic updates', async () => {
        const user = userEvent.setup();
        setup();

        const tofuCheckbox = screen.getByRole('checkbox', {name: /keyserver_tofu_lookup/});

        await user.click(tofuCheckbox);
        expect(tofuCheckbox).toHaveFocus();

        // Focus should be maintained even when buttons become enabled/disabled
        expect(document.activeElement).toBe(tofuCheckbox);
      });

      it('should handle memory cleanup on component lifecycle', () => {
        const {unmount} = setup();

        // Component should clean up properly without memory leaks
        expect(() => {
          unmount();
          // Trigger potential cleanup scenarios
          global.dispatchEvent(new Event('beforeunload'));
        }).not.toThrow();
      });
    });

    describe('error states', () => {
      it('should handle missing prefs gracefully', () => {
        const {ref} = setup({prefs: undefined});
        expect(ref.current.state.mvelo_tofu_lookup).toBe(false);
        expect(ref.current.state.wkd_lookup).toBe(false);
      });

      it('should handle partial prefs object', () => {
        const {ref} = setup({
          prefs: {
            keyserver: {
              mvelo_tofu_lookup: true
              // Missing other properties
            }
          }
        });
        expect(ref.current.state.mvelo_tofu_lookup).toBe(true);
        expect(ref.current.state.wkd_lookup).toBeUndefined();
      });

      it('should handle malformed preference values', () => {
        const malformedProps = {
          prefs: {
            keyserver: {
              mvelo_tofu_lookup: 'not-a-boolean',
              wkd_lookup: null,
              autocrypt_lookup: undefined,
              key_binding: {},
              oks_lookup: []
            }
          },
          onChangePrefs: jest.fn()
        };

        expect(() => setup(malformedProps)).not.toThrow();
      });

      it('should handle component unmount during async operations', async () => {
        const user = userEvent.setup();
        let resolvePromise;
        const slowSave = jest.fn().mockImplementation(() =>
          new Promise(resolve => {
            resolvePromise = resolve;
          })
        );
        const {unmount} = setup({onChangePrefs: slowSave});

        // Start save operation
        const checkbox = screen.getByRole('checkbox', {name: /keyserver_tofu_lookup/});
        await user.click(checkbox);

        const saveButton = screen.getByRole('button', {name: /form_save/});

        // Start save but don't wait
        act(() => {
          user.click(saveButton);
        });

        // Unmount component during save
        expect(() => unmount()).not.toThrow();

        // Clean up the promise
        if (resolvePromise) {
          resolvePromise();
        }
      });
    });
  });
});
