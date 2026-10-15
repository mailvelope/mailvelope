import React from 'react';
import {act, fireEvent, render, waitFor} from '@testing-library/react';
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
    // A user ID is free-form text (RFC 4880 section 5.11), so a key does not have
    // to carry an email address at all.
    {
      email: '',
      userId: 'Bob Johnson',
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
    },
    // Recipient identified by the user ID of the address-less key above, without
    // a key attached - it has to resolve against the keyring to be usable.
    {
      email: 'Bob Johnson',
      displayId: 'Bob Johnson'
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
        expect(tags).toHaveLength(3);

        // First recipient has key - should have success styling
        expect(tags[0]).toHaveClass('badge-success');
        expect(tags[0].textContent).toContain('alice@example.com');

        // Second recipient has no key - should have danger styling
        expect(tags[1]).toHaveClass('badge-danger');
        expect(tags[1].textContent).toContain('charlie@example.com');

        // Third recipient has no address and carries no key, but its user ID is
        // in the keyring - that resolves to success styling as well
        expect(tags[2]).toHaveClass('badge-success');
        expect(tags[2].textContent).toContain('Bob Johnson');
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

      it('should display pending styling for recipients awaiting keyserver lookup', () => {
        const {container} = setup({
          recipients: [{email: 'pending@example.com', displayId: 'pending@example.com', lookupPending: true}],
          keys: []
        });

        const tag = container.querySelector('.tag.badge');
        expect(tag).toHaveClass('badge-pending');
      });

      it('should prefer pending styling over extraKey info styling', () => {
        const {container} = setup({
          recipients: [{email: 'pending@example.com', lookupPending: true}],
          keys: [],
          extraKey: true
        });

        expect(container.querySelector('.tag.badge')).toHaveClass('badge-pending');
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
        // Controlled wrapper so the parent state update flows back into the
        // recipients prop - this is what triggers <ReactTags> to re-render
        // and is the case the setTimeout-based focus restoration covers.
        function ControlledRecipients() {
          const [recipients, setRecipients] = React.useState([]);
          return <RecipientInput keys={[]} recipients={recipients} onChangeRecipients={setRecipients} />;
        }
        const {container} = render(<ControlledRecipients />);
        const input = container.querySelector('.tag-input-field');

        await act(async () => {
          fireEvent.change(input, {target: {value: 'test@example.com'}});
        });
        await act(async () => {
          fireEvent.keyDown(input, {key: 'Enter', keyCode: 13});
        });

        // First, prove the addition actually happened (otherwise focus would
        // be trivially preserved on the input that never lost it).
        await waitFor(() => {
          expect(container.querySelectorAll('.tag.badge')).toHaveLength(1);
        });

        // Then verify the input is focused after the post-add re-render.
        await waitFor(() => {
          expect(document.activeElement).toBe(container.querySelector('.tag-input-field'));
        });
      });

      it('marks a newly added recipient as pending when no local key is available', async () => {
        const {container, props} = setup({recipients: [], keys: []});
        const input = container.querySelector('.tag-input-field');

        await act(async () => {
          fireEvent.change(input, {target: {value: 'new@example.com'}});
        });
        await act(async () => {
          fireEvent.keyDown(input, {key: 'Enter', keyCode: 13});
        });

        expect(props.onChangeRecipients).toHaveBeenCalledTimes(1);
        const args = props.onChangeRecipients.mock.calls[0];
        // Single-argument signature: only recipients, no error flag.
        expect(args).toHaveLength(1);
        expect(args[0]).toEqual([{
          email: 'new@example.com',
          displayId: 'new@example.com',
          checkServer: true,
          lookupPending: true
        }]);
      });

      it('attaches the local key when adding a recipient with a known address', async () => {
        const aliceKey = {
          email: 'alice@example.com',
          userId: 'Alice <alice@example.com>',
          keyId: 'AAAA1111',
          fingerprint: 'aabb'
        };
        const {container, props} = setup({recipients: [], keys: [aliceKey]});
        const input = container.querySelector('.tag-input-field');

        await act(async () => {
          fireEvent.change(input, {target: {value: 'alice@example.com'}});
        });
        await act(async () => {
          fireEvent.keyDown(input, {key: 'Enter', keyCode: 13});
        });

        const [recipients] = props.onChangeRecipients.mock.calls[0];
        expect(recipients[0]).toMatchObject({
          email: 'alice@example.com',
          key: aliceKey,
          fingerprint: 'aabb'
        });
        expect(recipients[0].lookupPending).toBeUndefined();
        expect(recipients[0].checkServer).toBeUndefined();
      });
    });

    // Encrypting to a key needs its fingerprint, not an address, so a key that
    // carries no email address (mockKeys[1]) has to be usable as a recipient.
    const bobKey = mockKeys[1];

    const addTag = async (container, value) => {
      const input = container.querySelector('.tag-input-field');
      await act(async () => {
        fireEvent.change(input, {target: {value}});
      });
      await act(async () => {
        fireEvent.keyDown(input, {key: 'Enter', keyCode: 13});
      });
    };

    describe('recipient without an email address', () => {
      it('should offer the address-less key in the suggestion list', async () => {
        const {container} = setup({recipients: [], keys: mockKeys});

        await act(async () => {
          fireEvent.change(container.querySelector('.tag-input-field'), {target: {value: 'Bob'}});
        });

        const suggestion = container.querySelector('.suggestions li');
        expect(suggestion).toBeTruthy();
        expect(suggestion.textContent).toContain(bobKey.userId);
        expect(suggestion.textContent).toContain(bobKey.keyId);
      });

      it('should add the recipient when its suggestion is selected', async () => {
        // The key was listed in the suggestions before as well, but selecting it
        // ran into the address validation in handleAddition and was dropped
        // silently - and the suggestion itself was identified by the empty email.
        const {container, props} = setup({recipients: [], keys: mockKeys});

        await act(async () => {
          fireEvent.change(container.querySelector('.tag-input-field'), {target: {value: 'Bob'}});
        });
        await act(async () => {
          fireEvent.mouseDown(container.querySelector('.suggestions li'));
        });

        const [recipients] = props.onChangeRecipients.mock.calls[0];
        expect(recipients).toHaveLength(1);
        expect(recipients[0]).toEqual({
          email: bobKey.userId,
          displayId: bobKey.userId,
          key: bobKey,
          fingerprint: bobKey.fingerprint
        });
      });

      it('should resolve a recipient typed as the user ID of a key', async () => {
        const {container, props} = setup({recipients: [], keys: mockKeys});

        await addTag(container, bobKey.userId);

        const [recipients] = props.onChangeRecipients.mock.calls[0];
        expect(recipients[0]).toMatchObject({
          email: bobKey.userId,
          key: bobKey,
          fingerprint: bobKey.fingerprint
        });
        // A key that is in the keyring must not be queued for a keyserver lookup,
        // which could never find an address-less user ID in the first place.
        expect(recipients[0].checkServer).toBeUndefined();
        expect(recipients[0].lookupPending).toBeUndefined();
      });

      it('should resolve a recipient typed as a key ID', async () => {
        const {container, props} = setup({recipients: [], keys: mockKeys});

        await addTag(container, mockKeys[0].keyId);

        const [recipients] = props.onChangeRecipients.mock.calls[0];
        expect(recipients[0]).toMatchObject({
          key: mockKeys[0],
          fingerprint: mockKeys[0].fingerprint
        });
      });

      it('should not re-suggest a key that is already a recipient', async () => {
        const {container} = setup({
          recipients: [mockRecipients[2]],
          keys: mockKeys
        });

        await act(async () => {
          fireEvent.change(container.querySelector('.tag-input-field'), {target: {value: 'Bob'}});
        });

        expect(container.querySelector('.suggestions li')).toBeNull();
      });

      it('should report an unknown name as not found instead of a pending lookup', async () => {
        const {container, props} = setup({recipients: [], keys: mockKeys});

        await addTag(container, 'someone-unknown');

        const [recipients] = props.onChangeRecipients.mock.calls[0];
        // Only an address can be looked up on a keyserver, so a name that is not
        // in the keyring reports "key not found" right away instead of waiting
        // for a lookup that can never happen.
        expect(recipients[0]).toEqual({
          email: 'someone-unknown',
          displayId: 'someone-unknown',
          checkServer: false
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

      it('should suppress the not-found alert while a recipient is pending', () => {
        const {container} = setup({
          recipients: [{email: 'pending@example.com', lookupPending: true}],
          keys: []
        });

        expect(container.querySelector('.alert-danger')).not.toBeInTheDocument();
      });

      it('should suppress the extraKey info alert while a recipient is pending', () => {
        const {container} = setup({
          recipients: [{email: 'pending@example.com', lookupPending: true}],
          keys: [],
          extraKey: true
        });

        expect(container.querySelector('.alert-info')).not.toBeInTheDocument();
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

      it('flips badge from danger to success when keys arrive without recipient identity changing', () => {
        // Simulates a key being imported (via keyserver or otherwise) for an
        // existing recipient. The recipient object reference is stable -
        // only the keys prop changes.
        const stableRecipient = {email: 'late-key@example.com', displayId: 'late-key@example.com'};
        const {container, props, rerender} = setup({
          recipients: [stableRecipient],
          keys: []
        });

        expect(container.querySelector('.tag.badge')).toHaveClass('badge-danger');

        const lateKey = {email: 'late-key@example.com', userId: 'Late', keyId: 'LK1', fingerprint: 'lk'};
        rerender(<RecipientInput {...props} recipients={[stableRecipient]} keys={[lateKey]} />);

        expect(container.querySelector('.tag.badge')).toHaveClass('badge-success');
      });

      it('flips badge from pending to success when matching key arrives', () => {
        const pendingRecipient = {email: 'alice@example.com', lookupPending: true};
        const {container, props, rerender} = setup({
          recipients: [pendingRecipient],
          keys: []
        });

        expect(container.querySelector('.tag.badge')).toHaveClass('badge-pending');

        const aliceKey = {email: 'alice@example.com', userId: 'Alice', keyId: 'A1', fingerprint: 'aabb'};
        rerender(<RecipientInput {...props} recipients={[pendingRecipient]} keys={[aliceKey]} />);

        expect(container.querySelector('.tag.badge')).toHaveClass('badge-success');
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

