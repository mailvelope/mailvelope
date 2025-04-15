/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import PropTypes from 'prop-types';
import React, {useCallback, useRef, useMemo} from 'react';
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
export function RecipientInput({extraKey, hideErrorMsg, keys, recipients, onChangeRecipients}) {
  const idRef = useRef(getUUID());

  /**
   * Converts recipient objects into tags format, assigning keys if not present
   * @param {Array<Object>} recipients - Array of recipient objects containing email addresses
   * @param {Array<Key>} keys - Array of key objects to search through
   * @param {boolean} [extraKey] - Whether there is extra key present
   * @return {Array<Tag>} Array of recipient objects in tag format
   */
  const recipientsToTags = (recipients, keys, extraKey) =>
    recipients.map(r => {
      if (!r.key) {
        r.key = findRecipientKey(keys, r.email);
      }
      return recipientToTag(r, extraKey);
    }) || [];

  const tags = useMemo(() => recipientsToTags(recipients, keys, extraKey), [recipients, keys, extraKey]);

  // this is a callback function because we need to update it with new tags before rerender happened
  const hasError = useCallback(tags => hasAnyRecipientNoKey(tags, keys, extraKey) && !hideErrorMsg, [keys, extraKey, hideErrorMsg]);

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

  /**
   * Updates recipients for the parent component
   * Has to be called once on init to update error statuses of the parent component
   */
  const updateParentRecipients = useCallback(tags =>
    onChangeRecipients(tags.map(t => tagToRecipient(t)), hasError(tags)),
  [hasError, onChangeRecipients, tagToRecipient]
  );

  const onDelete = useCallback(tagIndex => {
    updateParentRecipients(tags.filter((_, i) => i !== tagIndex));
  }, [tags, updateParentRecipients]);

  const onAddition = useCallback(newTag => {
    if (checkEmail(newTag.id)) {
      updateParentRecipients([...tags, newTag]);
      // After updating the tags, refocus the input field using the constant id
      // This is the only way because <ReactTags> doesn't give access to it's children, nor gives an API to set focus
      setTimeout(() => {
        const inputElem = document.querySelector(`[id="${idRef.current}"] .tag-input-field`);
        if (inputElem) {
          inputElem.focus();
        }
      }, 0);
    }
  }, [idRef, tags, updateParentRecipients]);

  const onFilterSuggestions = (textInputValue, possibleSuggestionsArray) => {
    const lowerCaseQuery = textInputValue.toLowerCase();
    return possibleSuggestionsArray
    .filter(suggestion => suggestion.searchStr.toLowerCase().includes(lowerCaseQuery))
    .slice(0, 10);
  };

  const suggestions = keys
  .filter(key => !tags.find(tag => tag.id === key.email))
  .map(key => ({
    id: key.email,
    // `<` and `>` are replaced with `＜` and `＞` to prevent case when searching `lt` and `gt` in the HTML
    // This is a workaround for the `react-tag-input` library
    // which doesn't escape the HTML tags in the suggestion list
    text: `${encodeHTML(key.userId.replace('<', '＜').replace('>', '＞'))} - ${key.keyId}`,
    searchStr: `${key.userId} ${key.keyId}`// for search
  }));

  return (
    <div id={idRef.current} className="mb-0">
      <ReactTags
        tags={tags}
        suggestions={suggestions}
        handleDelete={onDelete}
        handleAddition={onAddition}
        handleFilterSuggestions={onFilterSuggestions}
        placeholder={null}
        allowDragDrop={false}
        minQueryLength={1}
        separators={['Enter', 'Tab', 'Space']}
        classNames={{
          tags: 'recipients-input mb-0 form-control',
          tagInput: 'tag-input-wrapper flex-grow-1',
          tagInputField: 'tag-input-field m-0 p-0',
          selected: 'tag-selected-list d-flex flex-wrap',
          tag: 'tag badge',
          remove: 'tag-remove',
          suggestions: 'suggestions d-block dropdown-menu',
          activeSuggestion: 'active-suggestion dropdown-item:hover'
        }} />
      {!hideErrorMsg && hasError(tags) && (
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
