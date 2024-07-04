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

/**
 * Component that inputs recipient email
 * @param {Props} props - Component properties
 * @returns {React.JSX.Element}
 */
export function RecipientInput(props) {
  const id = getUUID();

  /**
   *
   * @param {Recipient} recipient
   * @returns {Tag}
   */
  // The function doesn't change state, disabling the check
  const recipientToTag = useCallback(recipient => ({
    id: recipient.email,
    text: recipient.displayId,
    // Calc a CSS class for the tag object
    className: `tag-${recipient.key ? 'success' : (props.extraKey ? 'info' : 'danger')}`,
    recipient
  }), [props.extraKey]);

  /**
   * Verifies a recipient after input, gets their key, colors the
   * input tag accordingly and checks if encryption is possible.
   * @param  {Object|Recipient} data
   * @returns {Recipient}
   */
  const createRecipient = useCallback(data => {
    /**
     * Finds the recipient's corresponding public key and sets it
     * on the 'key' attribute on the recipient object.
     * @param  {Recipient} recipient   The recipient object
     * @return {Key|undefined}         The key object (undefined if none found)
    */
    function findKey(recipient) {
      return props.keys.find(key => {
        const fprMatch = recipient.fingerprint && key.fingerprint === recipient.fingerprint;
        const emailMatch = key.email && key.email.toLowerCase() === recipient.email.toLowerCase();
        return fprMatch && emailMatch || emailMatch;
      });
    }

    if (!data) {
      return;
    }
    const recipient = {
      email: data.email ? data.email : data.id,
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
    // lookup key in local cache
    recipient.key = findKey(recipient);
    if (recipient.key) {
      recipient.fingerprint = recipient.key.fingerprint;
    }
    if (!recipient.key && !recipient.checkedServer) {
      /**
       * No local key found
       * Do a search with the autoLocate module
       * if a key was not found in the local keyring.
       */
      recipient.checkedServer = true;
      props.onAutoLocate(recipient);
    }
    return recipient;
  }, [props]);

  const [tags, setTags] = useState(
    props.recipients.map(r => recipientToTag(props, r))
  );
  // Listen for changes in props.recipients
  useEffect(() => {
    setTags(props.recipients.map(r => recipientToTag(r)));
  }, [props.recipients, recipientToTag]);
  const [hasError, setHasError] = useState(false);
  /**
   * Checks if all recipients have a public key and prevents encryption
   * if one of them does not have a key.
   */
  const checkEncryptStatus = useCallback(tags => {
    // TODO this seems like a bit of an extra work to iterate over the whole array
    const hasError = tags.some(t => !t.recipient.key) && !props.extraKey;
    setHasError(hasError && !props.hideErrorMsg);
    props.onChangeRecipient && props.onChangeRecipient({hasError});
  }, [props]); // TODO Be more granular with deps (split props)

  const onDelete = useCallback(tagIndex => {
    setTags(tags.filter((_, i) => i !== tagIndex));
    checkEncryptStatus(tags);
  }, [tags, checkEncryptStatus]);

  const onAddition = useCallback(
  /**
   * @param {Tag} newTag
   */
    newTag => {
      if (checkEmail(newTag.id)) {
        const recipient = createRecipient(newTag);
        setTags([...tags, recipientToTag(recipient)]);
        if (recipient.key || recipient.checkedServer) {
          checkEncryptStatus(tags);
        }
      }
    },
    [tags, checkEncryptStatus, createRecipient, recipientToTag]
  );

  const suggestions = props.keys.map(key => ({
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
      {!props.hideErrorMsg && hasError && (
        <div className="alert alert-danger mb-0" role="alert">
          <strong>{l10n.map.editor_key_not_found}</strong> <span>{l10n.map.editor_key_not_found_msg}</span>
        </div>
      )}
      {props.extraKey && (
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
 * @property {Function} onChangeRecipient - Callback function for recipient changes
 * @property {Array<Recipient>} recipients - Array of recipients
 */
RecipientInput.propTypes = {
  extraKey: PropTypes.bool,
  hideErrorMsg: PropTypes.bool,
  keys: PropTypes.array,
  onAutoLocate: PropTypes.func,
  onChangeRecipient: PropTypes.func,
  recipients: PropTypes.array
};
