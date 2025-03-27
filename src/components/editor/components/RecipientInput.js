/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import PropTypes from 'prop-types';
import React, {useCallback, useState, useEffect} from 'react';
// `WithContext` as `ReactTags` is taken from the official example
import {WithContext as ReactTags} from 'react-tag-input';
import * as l10n from '../../../lib/l10n';
import {checkEmail, encodeHTML, getUUID} from '../../../lib/util';

import './RecipientInput.scss';

l10n.register([
  'editor_key_has_extra_msg',
  'editor_key_not_found',
  'editor_key_not_found_msg'
]);

/**
 * Checks if all recipients have a public key
 * @param {Tag[]} tags - Array of tags
 * @param {Key[]} keys - Array of public keys
 * @param {Boolean} extraKey - Flag indicating whether extra key input is enabled
 * @returns {Boolean} true if any recipient has no key
 */
function hasAnyRecipientNoKey(tags, keys, extraKey) {
  return tags.some(t => !findRecipientKey(keys, t.id)) && !extraKey;
}

/**
 * Creates a bootstrap badge class name
 * @param {Boolean} isSuccess - Flag indicating whether the recipient has a key
 * @param {Boolean} hasExtraKey - Flag indicating whether extra key input is enabled
 * @returns {String} CSS class name for the tag
 */
function getTagClassName(isSuccess, hasExtraKey) {
  return `badge-${isSuccess ? 'success' : (hasExtraKey ? 'info' : 'danger')}`;
}

/**
 * Converts a recipient object to a tag object.
 * @param {Recipient} recipient - Recipient object
 * @param {Boolean} hasExtraKey - Flag indicating whether extra key input is enabled
 * @returns {Tag}
 */
function recipientToTag(recipient, hasExtraKey) {
  return {
    id: recipient.email,
    text: recipient.displayId || recipient.email,
    // Calc a CSS class for the tag object
    className: getTagClassName(recipient.key, hasExtraKey)
  };
}

/**
   * Finds the recipient's corresponding public key.
   * @param {Key[]} keys - array of keys to search for match
   * @param {String} email - recipient's email
   */
function findRecipientKey(keys, email) {
  return keys.find(key => key.email && key.email.toLowerCase() === email.toLowerCase());
}

/**
 * Component that inputs recipient email
 * @param {Props} props - Component properties
 * @returns {React.JSX.Element}
 */
export function RecipientInput({extraKey, hideErrorMsg, keys, onAutoLocate, onChangeRecipients, recipients}) {
  const id = getUUID();

  const [tags, setTags] = useState(
    recipients.map(r => recipientToTag(r, extraKey))
  );
  const hasError = hasAnyRecipientNoKey(tags, keys, extraKey) && !hideErrorMsg;

  /**
   * Converts a tag into recipient object
   * Also performs a key search in a key array for a matching key.
   * If the key is not found, marks it as one for the `auto-locate` procedure
   * @param  {Tag} tag - Tag to convert
   * @returns {Recipient} - Recipient object with a key attached if found
   */
  const tagToRecipient = useCallback(tag => {
    if (!tag || !tag.id) {
      return;
    }
    const recipient = {
      email: tag.id,
      displayId: tag.id
    };
    const key = findRecipientKey(keys, recipient.email);
    if (key) {
      recipient.key = key;
      recipient.fingerprint = key.fingerprint;
    }
    if (!recipient.key && !recipient.checkServer) {
      // No local key found, do a search with the autoLocate module
      recipient.checkServer = true;
    }
    return recipient;
  }, [keys]);

  // Listen for changes in keys (also if updated externally)
  useEffect(() => {
    // Update tags's recipients with new keys
    const newTags = tags.map(tag => ({
      ...tag,
      className: getTagClassName(findRecipientKey(keys, tag.id), extraKey)
    }));
    setTags(newTags);
    // We do not want circular dependency, hence we do not set `tags`
    // as a dependency for `useEffect`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys, extraKey]);

  useEffect(() => {
    onChangeRecipients && onChangeRecipients({recipients: tags.map(t => tagToRecipient(t)), hasError});
    // We do not want circular dependency, hence we do not set onChangeRecipients
    // as a dependency for `useEffect`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags, hasError]);

  const onDelete = useCallback(tagIndex => {
    setTags(tags.filter((_, i) => i !== tagIndex));
  }, [tags]);

  const onAddition = useCallback(newTag => {
    if (checkEmail(newTag.id)) {
      const recipient = tagToRecipient(newTag);
      if (recipient.checkServer) {
        // No local key found, do a search with the autoLocate module
        onAutoLocate(recipient);
      }
      setTags([...tags, recipientToTag(recipient, extraKey)]);
    }
  }, [tags, extraKey, tagToRecipient, onAutoLocate]);

  const suggestions = keys
  .filter(key => !tags.find(tag => tag.id === key.email))
  .map(key => ({
    id: key.email,
    text: `${encodeHTML(key.userId)} - ${key.keyId}`
  }));

  return (
    <div id={id} className="input-group mb-3">
      <ReactTags
        tags={tags}
        suggestions={suggestions}
        handleDelete={onDelete}
        handleAddition={onAddition}
        placeholder={null}
        allowDragDrop={false}
        minQueryLength={1}
        id="recipients-input"
        classNames={{
          tags: 'recipients-input mb-1',
          tagInput: 'tag-input-wrapper flex-grow-1',
          tagInputField: 'tag-input-field m-0 p-0',
          selected: 'tag-selected-list d-flex flex-wrap',
          tag: 'tag',
          remove: 'tag-remove',
          suggestions: 'suggestions d-block',
          activeSuggestion: 'active-suggestion'
        }} />
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
 * @property {Boolean} extraKey - Flag indicating whether extra key input is enabled
 * @property {Boolean} hideErrorMsg - Flag indicating whether error message should be hidden
 * @property {Key[]} keys - Array of public keys
 * @property {Function} onAutoLocate - Callback function for auto-locating keys
 * @property {Function} onChangeRecipients - Callback function for recipient changes
 * @property {Recipient[]} recipients - Array of recipients
 */
RecipientInput.propTypes = {
  extraKey: PropTypes.bool,
  hideErrorMsg: PropTypes.bool,
  keys: PropTypes.array,
  onAutoLocate: PropTypes.func,
  onChangeRecipients: PropTypes.func,
  recipients: PropTypes.array
};

/**
 * @typedef {Object} Recipient
 * @property {String} email Email address of the recipient
 * @property {String} displayId Display name of the recipient
 * @property {String} fingerprint Fingerprint of the recipient's public key
 * @property {Object} key Public key of the recipient
 */

/**
 * @typedef {Object} Key
 * @property {String} userId User ID of the key owner (name or email)
 * @property {String} keyId Key ID of the key
 * @property {String} email Email address of the key owner
 * @property {String} fingerprint Fingerprint (hash) of the key
 */

/**
 * @typedef {Object} Tag
 * Represents id/value combination for the _ReactTags_ component
 * @property {String} id Email address of the recipient
 * @property {String} text Display text of the recipient
 * @property {String} className CSS class for the label
 */
