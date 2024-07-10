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
/// END DATA TYPES ///

/// "STATIC" FUNCTIONS
/**
 * Checks if all recipients have a public key and prevents encryption
 * if one of them does not have a key.
 * @param {Tag[]} tags - Array of tags
 * @param {Key[]} keys - Array of public keys
 * @param {Boolean} extraKey - Flag indicating whether extra key input is enabled
 * @returns {Boolean} true if any recipient is unencrypted
 */
const isAnyRecipientUnencrypted = (tags, keys, extraKey) =>
  // TODO calling findRecipientKey is suboptimal
  tags.some(t => !findRecipientKey(keys, t.id)) && !extraKey;

/**
 * Creates a tag class name
 * @param {Boolean} isSuccess - Flag indicating whether the recipient has a key
 * @param {Boolean} hasExtraKey - Flag indicating whether extra key input is enabled
 * @returns {String} CSS class name for the tag
 */
const getTagClassName = (isSuccess, hasExtraKey) =>
  `tag-${isSuccess ? 'success' : (hasExtraKey ? 'info' : 'danger')}`;

/**
 * Converts a recipient object to a tag object.
 * @param {Recipient} recipient - Recipient object
 * @param {Boolean} hasExtraKey - Flag indicating whether extra key input is enabled
 * @returns {Tag}
 */
function recipientToTag(recipient, hasExtraKey) {
  return {
    id: recipient.email,
    text: recipient.displayId,
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
    if (!recipient.key && !recipient.checkedServer) {
      // No local key found
      // Do a search with the autoLocate module
      // if a key was not found in the local keyring.
      recipient.checkedServer = true;
    }
    return recipient;
  }, [keys]);

  const [tags, setTags] = useState(
    recipients.map(r => recipientToTag(r, extraKey))
  );
  const hasError = isAnyRecipientUnencrypted(tags, keys, extraKey) && !hideErrorMsg;
  console.debug('RecipientInput hasError', hasError);

  // Listen for changes in keys (also if updated externally)
  useEffect(() => {
    // Update tags's recipients with new keys
    const newTags = tags.map(tag => ({
      ...tag, // Spread existing properties
      className: getTagClassName(findRecipientKey(keys, tag.id), extraKey)
    }));
    setTags(newTags);
    console.debug('useEffect changed keys');
    // We do not want circular dependency, hence we do not set `tags`
    // as a dependency for `useEffect`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys, extraKey]);

  useEffect(() => {
    onChangeRecipients && onChangeRecipients({recipients: tags.map(t => tagToRecipient(t)), hasError});
    console.debug('useEffect onChangeRecipients');
    // We do not want circular dependency, hence we do not set onChangeRecipients
    // as a dependency for `useEffect`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tags, hasError]);

  const onDelete = useCallback(tagIndex => {
    setTags(tags.filter((_, i) => i !== tagIndex));
  }, [tags]);

  const onAddition = useCallback(
  /**
   * @param {Tag} newTag
   */
    newTag => {
      if (checkEmail(newTag.id)) {
        const recipient = tagToRecipient(newTag);
        if (recipient.checkedServer) {
          // No local key found
          // Do a search with the autoLocate module
          // if a key was not found in the local keyring.
          onAutoLocate(recipient);
        }
        setTags([...tags, recipientToTag(recipient, extraKey)]);
      }
    },
    [tags, extraKey, tagToRecipient, onAutoLocate]
  );

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
