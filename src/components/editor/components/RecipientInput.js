/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

/**
 * Parts of the recipient input is based on Hoodiecrow (MIT License)
 * Copyright (c) 2014 Whiteout Networks GmbH.
 * See https://github.com/tanx/hoodiecrow/blob/master/LICENSE
 */

import PropTypes from 'prop-types';
import React, {useCallback, useState, useEffect} from 'react';
import {WithContext as ReactTags} from 'react-tag-input';
import * as l10n from '../../../lib/l10n';
import {checkEmail, getUUID} from '../../../lib/util';

import './RecipientInput.scss';

l10n.register([
  'editor_key_has_extra_msg',
  'editor_key_not_found',
  'editor_key_not_found_msg'
]);

/// DATA TYPES ///
/**
 * @typedef {Object} Recipient
 * @property {string} email Email address of the recipient
 * @property {string} displayId Display name of the recipient
 * @property {string} fingerprint Fingerprint of the recipient's public key
 * @property {Object} key Public key of the recipient
 */

/**
 * @typedef {Object} Key
 * @property {string} userId User ID of the key owner (name or email)
 * @property {string} keyId Key ID of the key
 * @property {string} email Email address of the key owner
 * @property {string} fingerprint Fingerprint (hash) of the key
 */

/**
 * @typedef {Object} Tag
 * Represents id/value combination for the _ReactTags_ component
 * @property {string} id Email address of the recipient
 * @property {string} text Display text of the recipient
 * @property {string} className CSS class for the label
 * @property {Recipient} recipient Store recipient within a tag
 */
/// END DATA TYPES ///

/// "STATIC" FUNCTIONS
/**
 * Checks if all recipients have a public key and prevents encryption
 * if one of them does not have a key.
 * @param {Tag[]} tags - Array of tags
 * @param {string} extraKey - Flag indicating whether extra key input is enabled
 * @returns {boolean} true if any recipient is unencrypted
 */
const isAnyRecipientUnencrypted = (tags, extraKey) =>
  tags.some(t => !t.recipient.key) && !extraKey;

/// END

/**
 * Component that inputs recipient email
 * @param {Props} props - Component properties
 * @returns {React.JSX.Element}
 */
export function RecipientInput({
  extraKey,
  hideErrorMsg,
  keys,
  onAutoLocate,
  onChangeRecipients,
  recipients,
}) {
  const id = getUUID();

  /**
   *
   * @param {Recipient} recipient
   * @returns {Tag}
   */
  const recipientToTag = useCallback(recipient => ({
    id: recipient.email,
    text: recipient.displayId,
    // Calc a CSS class for the tag object
    className: `tag-${recipient.key ? 'success' : (extraKey ? 'info' : 'danger')}`,
    recipient
  }), [extraKey]);

  /**
   * Finds the recipient's corresponding public key and sets it
   * on the 'key' attribute on the recipient object.
   * @param  {Recipient} recipient   The recipient object
   * @return {Key|undefined}         The key object (undefined if none found)
  */
  const findKey = useCallback(recipient =>
    keys.find(key => {
      const fprMatch = recipient.fingerprint && key.fingerprint === recipient.fingerprint;
      const emailMatch = key.email && key.email.toLowerCase() === recipient.email.toLowerCase();
      return fprMatch && emailMatch || emailMatch;
    }), [keys]);

  /**
   * Update recipient's key
   * @param {Recipient} recipient
   */
  const updateRecipientKey = useCallback(recipient => {
    const key = findKey(recipient);
    if (key) {
      recipient.key = key;
      recipient.fingerprint = key.fingerprint;
    }
  }, [findKey]);

  /**
   * Verifies a recipient after input, gets their key
   * @param  {Object|Recipient} data
   * @returns {Recipient}
   */
  const createRecipient = useCallback(data => {
    if (!data) {
      return;
    }
    const recipient = {
      email: data.email || data.id,
      displayId: data.displayId,
      fingerprint: data.fingerprint
    };
    if (recipient.email) {
      // display only address from autocomplete
      recipient.displayId = recipient.email;
    } else {
      // set address after manual input
      recipient.email = recipient.displayId;
    }
    updateRecipientKey(recipient);
    return recipient;
  }, [updateRecipientKey]);

  const [tags, setTags] = useState(
    recipients.map(r => recipientToTag(r))
  );
  const [hasError, setHasError] = useState(isAnyRecipientUnencrypted(tags, extraKey) && !hideErrorMsg);

  // Update external `recipients` prop.
  // TODO This in fact doesn't work, and I am not sure we actually need to do that
  recipients = tags.map(t => t.recipient);

  // Listen for changes in keys (also if updated externally)
  useEffect(() => {
    // Update tags's recipients with new keys
    tags.forEach(t => {
      if (t.recipient.checkedServer) {
        updateRecipientKey(t.recipient);

        // Here we update a tag to indicate visual changes after key retrival
        t.className = recipientToTag(t.recipient).className;

        // This is the wrong way of updating tags, `setTags` should be called instead.
        // But it causes circular dependency in `useEffect`, because it depends on `tags`.
        // We can remove it from deps and supress lint, but we want to watch `tags` too.
        // TODO Find a better way
      }
    });
    const hasError = isAnyRecipientUnencrypted(tags, extraKey) && !hideErrorMsg;
    setHasError(hasError);
  }, [keys, tags, extraKey, hideErrorMsg, updateRecipientKey, recipientToTag]);

  useEffect(() => {
    onChangeRecipients && onChangeRecipients({recipients: tags.map(t => t.recipient), hasError});
    // We do not want circular dependency, hence we do not set onChangeRecipient
    // as a dependency for `useEffect`
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasError, tags]);

  const onDelete = useCallback(tagIndex => {
    setTags(tags.filter((_, i) => i !== tagIndex));
  }, [tags]);

  const onAddition = useCallback(
  /**
   * @param {Tag} newTag
   */
    newTag => {
      if (checkEmail(newTag.id)) {
        const recipient = createRecipient(newTag);
        if (!recipient.key && !recipient.checkedServer) {
          // No local key found
          // Do a search with the autoLocate module
          // if a key was not found in the local keyring.
          recipient.checkedServer = true;
          onAutoLocate(recipient);
        }
        setTags([...tags, recipientToTag(recipient)]);
      }
    },
    [tags, createRecipient, recipientToTag, onAutoLocate]
  );

  // TODO Update suggestions on keys change
  const suggestions = keys.map(key => ({
    id: key.email,
    text: `${key.userId} - ${key.keyId}`
  }));

  return (
    // TODO replace `has-error` class with bootstrap validation
    <div id={id} className={`recipients-input ${hasError ? 'has-error' : ''}`}>
      <ReactTags
        tags={tags}
        suggestions={suggestions}
        handleDelete ={onDelete}
        handleAddition ={onAddition}
        placeholder={null}
        allowDragDrop={false}
        minQueryLength={1} />
      {!hideErrorMsg && hasError && (
        <div className="alert alert-danger mb-0" role="alert">
          <strong>{l10n.map.editor_key_not_found}</strong> <span>{l10n.map.editor_key_not_found_msg}</span>
        </div>
      )}
      {extraKey && (
        <div className="alert alert-info mb-0" role="alert">
          <span>{l10n.map.editor_key_has_extra_msg}</span>
        </div>
      )}
    </div>
  );
}

/**
 * @typedef {Object} Props
 * @property {boolean} extraKey - Flag indicating whether extra key input is enabled
 * @property {boolean} hideErrorMsg - Flag indicating whether error message should be hidden
 * @property {Array<Key>} keys - Array of public keys
 * @property {Function} onAutoLocate - Callback function for auto-locating keys
 * @property {Function} onChangeRecipients - Callback function for recipient changes
 * @property {Array<Recipient>} recipients - Array of recipients
 */
RecipientInput.propTypes = {
  extraKey: PropTypes.bool,
  hideErrorMsg: PropTypes.bool,
  keys: PropTypes.array,
  onAutoLocate: PropTypes.func,
  onChangeRecipients: PropTypes.func,
  recipients: PropTypes.array
};
