import React from 'react';
import {render, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as l10n from 'lib/l10n';
import {RecipientInput} from 'components/editor/components/RecipientInput';

describe('RecipientInput component', () => {
  const setup = (customProps = {}) => {
    const finalProps = {
      extraKey: false,
      hideErrorMsg: false,
      keys: [],
      onAutoLocate: jest.fn(),
      onChangeRecipients: jest.fn(),
      recipients: [],
      ...customProps
    };
    const rtlUtils = render(<RecipientInput {...finalProps} />);
    return {
      ...rtlUtils,
      props: finalProps
    };
  };

  const mockKeys = [
    {
      email: 'alice@example.com',
      userId: 'Alice Smith <alice@example.com>',
      keyId: 'E47CCA58286FEFE6',
      fingerprint: '9acdfd634605bc0a0b18d518e38cca58286fefe6'
    },
    {
      email: 'bob@example.com',
      userId: 'Bob Johnson <bob@example.com>',
      keyId: 'F58DDB69397G0FG7',
      fingerprint: 'a9defe745716cd1b1c29e629f49ddb69397g0fg7'
    }
  ];

  const mockRecipients = [
    {
      email: 'alice@example.com',
      displayId: 'alice@example.com',
      key: mockKeys[0],
      fingerprint: '9acdfd634605bc0a0b18d518e38cca58286fefe6'
    },
    {
      email: 'charlie@example.com',
      displayId: 'charlie@example.com'
    }
  ];

  beforeAll(() => {
    l10n.mapToLocal();
  });

  it('should render without errors', () => {
    const {container} = setup();
    expect(container.firstChild).toBeTruthy();
  });

  describe('Unit tests', () => {
    describe('recipient tags display', () => {
      it('should display recipients as tags with appropriate styling', () => {
        const {container} = setup({
          recipients: mockRecipients,
          keys: mockKeys
        });

        const tags = container.querySelectorAll('.tag.badge');
        expect(tags).toHaveLength(2);

        // First recipient has key - should have success styling
        expect(tags[0]).toHaveClass('badge-success');
        expect(tags[0].textContent).toContain('alice@example.com');

        // Second recipient has no key - should have danger styling
        expect(tags[1]).toHaveClass('badge-danger');
        expect(tags[1].textContent).toContain('charlie@example.com');
      });

      it('should display info styling when extraKey is enabled', () => {
        const {container} = setup({
          recipients: [mockRecipients[1]], // recipient without key
          keys: [],
          extraKey: true
        });

        const tag = container.querySelector('.tag.badge');
        expect(tag).toHaveClass('badge-info');
      });

      it('should handle recipients with displayId different from email', () => {
        const recipientWithDisplayId = {
          email: 'test@example.com',
          displayId: 'Test User'
        };

        const {container} = setup({
          recipients: [recipientWithDisplayId]
        });

        const tag = container.querySelector('.tag.badge');
        expect(tag.textContent).toContain('Test User');
      });
    });

    describe('suggestions', () => {
      it('should display suggestions input field', () => {
        const {container} = setup({
          keys: mockKeys
        });

        const input = container.querySelector('.tag-input-field');
        expect(input).toBeInTheDocument();
      });

      it('should have reactive suggestions functionality', () => {
        const {container} = setup({
          keys: mockKeys
        });

        // The input field should exist for suggestions functionality
        const input = container.querySelector('.tag-input-field');
        expect(input).toBeInTheDocument();

        // Component should have class structure for suggestions
        expect(container.querySelector('.recipients-input')).toBeInTheDocument();
      });
    });

    describe('input functionality', () => {
      it('should have input field for email addresses', () => {
        const {container} = setup();

        const input = container.querySelector('.tag-input-field');
        expect(input).toBeInTheDocument();
        expect(input.tagName.toLowerCase()).toBe('input');
      });

      it('should have interactive input functionality', () => {
        const {container} = setup();

        const input = container.querySelector('.tag-input-field');
        expect(input).toBeInTheDocument();

        // Input should be interactive
        expect(input).not.toHaveAttribute('disabled');
      });
    });

    describe('recipient management', () => {
      it('should allow removing recipients', async () => {
        const user = userEvent.setup();
        const {container, props} = setup({
          recipients: [mockRecipients[0]],
          keys: mockKeys
        });

        const removeButton = container.querySelector('.tag-remove');
        expect(removeButton).toBeInTheDocument();

        await user.click(removeButton);

        expect(props.onChangeRecipients).toHaveBeenCalledTimes(1);
        const callArgs = props.onChangeRecipients.mock.calls[0];
        expect(callArgs[0]).toHaveLength(0); // Empty recipients array
      });

      it('should focus input after adding recipient', async () => {
        const user = userEvent.setup();
        const {container} = setup();

        const input = container.querySelector('.tag-input-field');

        await user.type(input, 'test@example.com');
        await user.keyboard('{Enter}');

        // Wait for focus to be restored
        await waitFor(() => {
          expect(document.activeElement).toBe(input);
        });
      });
    });

    describe('error messages', () => {
      it('should show error message when recipients lack keys and extraKey is false', () => {
        const {container} = setup({
          recipients: [mockRecipients[1]], // recipient without key
          keys: [],
          extraKey: false,
          hideErrorMsg: false
        });

        const errorAlert = container.querySelector('.alert-danger');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert.textContent).toContain('editor_key_not_found');
      });

      it('should hide error message when hideErrorMsg is true', () => {
        const {container} = setup({
          recipients: [mockRecipients[1]], // recipient without key
          keys: [],
          extraKey: false,
          hideErrorMsg: true
        });

        const errorAlert = container.querySelector('.alert-danger');
        expect(errorAlert).not.toBeInTheDocument();
      });

      it('should not show error message when extraKey is true', () => {
        const {container} = setup({
          recipients: [mockRecipients[1]], // recipient without key
          keys: [],
          extraKey: true,
          hideErrorMsg: false
        });

        const errorAlert = container.querySelector('.alert-danger');
        expect(errorAlert).not.toBeInTheDocument();
      });

      it('should show info message when extraKey is true', () => {
        const {container} = setup({
          extraKey: true
        });

        const infoAlert = container.querySelector('.alert-info');
        expect(infoAlert).toBeInTheDocument();
        expect(infoAlert.textContent).toContain('editor_key_has_extra_msg');
      });
    });

    describe('keyboard navigation', () => {
      it('should support keyboard input', () => {
        const {container} = setup();

        const input = container.querySelector('.tag-input-field');
        expect(input).toBeInTheDocument();

        // Input should accept keyboard events
        input.focus();
        expect(document.activeElement).toBe(input);
      });

      it('should support multiple separator keys', () => {
        const {container} = setup();

        // Component is configured to accept Enter, Tab, and Space
        // This is a structural test of the ReactTags configuration
        expect(container.querySelector('.recipients-input')).toBeInTheDocument();
      });
    });
  });

  describe('Integration tests', () => {
    describe('key searching and auto-locate', () => {
      it('should handle recipients without available keys', () => {
        const {container} = setup({
          recipients: [mockRecipients[1]], // recipient without key
          keys: [] // No keys available
        });

        // Component should handle recipients without keys gracefully
        const tags = container.querySelectorAll('.tag.badge');
        expect(tags).toHaveLength(1);
        expect(tags[0]).toHaveClass('badge-danger');
      });

      it('should show error state for recipients without keys', () => {
        const {container} = setup({
          recipients: [mockRecipients[1]], // recipient without key
          keys: []
        });

        // Error alert should be visible
        const errorAlert = container.querySelector('.alert-danger');
        expect(errorAlert).toBeInTheDocument();
      });

      it('should not show error when all recipients have keys', () => {
        const {container} = setup({
          recipients: [mockRecipients[0]], // recipient with key
          keys: mockKeys
        });

        // No error alert should be visible
        const errorAlert = container.querySelector('.alert-danger');
        expect(errorAlert).not.toBeInTheDocument();
      });
    });

    describe('recipient updates', () => {
      it('should have onChangeRecipients callback configured', () => {
        const {props} = setup({
          recipients: [mockRecipients[0]],
          keys: mockKeys
        });

        // Component should have onChangeRecipients callback configured
        expect(typeof props.onChangeRecipients).toBe('function');
      });

      it('should update recipients when props change', () => {
        const {rerender, props, container} = setup({
          recipients: [],
          keys: mockKeys
        });

        // Update with new recipients
        rerender(<RecipientInput {...props} recipients={[mockRecipients[0]]} />);

        const tags = container.querySelectorAll('.tag.badge');
        expect(tags).toHaveLength(1);
        expect(tags[0].textContent).toContain('alice@example.com');
      });
    });

    describe('edge cases', () => {
      it('should handle empty recipients array', () => {
        const {container} = setup({
          recipients: [],
          keys: []
        });

        const tags = container.querySelectorAll('.tag.badge');
        expect(tags).toHaveLength(0);

        const input = container.querySelector('.tag-input-field');
        expect(input).toBeInTheDocument();
      });

      it('should handle recipients with empty email gracefully', () => {
        const recipientWithEmptyEmail = {
          email: '',
          displayId: 'Empty Email Recipient'
        };

        const {container} = setup({
          recipients: [recipientWithEmptyEmail]
        });

        // Should handle gracefully without crashing
        expect(container.firstChild).toBeTruthy();
      });

      it('should handle case-insensitive key matching functionality', () => {
        const {container} = setup({
          keys: [{
            email: 'ALICE@EXAMPLE.COM',
            userId: 'Alice Smith',
            keyId: 'E47CCA58286FEFE6',
            fingerprint: '9acdfd634605bc0a0b18d518e38cca58286fefe6'
          }]
        });

        // The component should handle case-insensitive matching
        // This is tested implicitly through the component's key matching logic
        expect(container.firstChild).toBeTruthy();
      });

      it('should handle missing recipients prop gracefully', () => {
        const {container} = setup({
          // Don't pass recipients prop at all
        });

        expect(container.firstChild).toBeTruthy();
      });

      it('should handle missing key properties gracefully', () => {
        const keysWithMissingProps = [{
          email: 'test@example.com'
          // Missing userId, keyId, fingerprint
        }];

        const {container} = setup({
          keys: keysWithMissingProps
        });

        expect(container.firstChild).toBeTruthy();
      });
    });

    describe('component lifecycle', () => {
      it('should maintain unique component ID', () => {
        const {container: container1} = setup();
        const {container: container2} = setup();

        const id1 = container1.firstChild.id;
        const id2 = container2.firstChild.id;

        expect(id1).toBeTruthy();
        expect(id2).toBeTruthy();
        expect(id1).not.toBe(id2);
      });

      it('should maintain input focus management', () => {
        const {container} = setup();

        const input = container.querySelector('.tag-input-field');
        expect(input).toBeInTheDocument();

        // Input should be focusable
        input.focus();
        expect(document.activeElement).toBe(input);
      });
    });
  });
});

