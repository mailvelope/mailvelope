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
import React, {useCallback, useState} from 'react';
import {WithContext as ReactTags} from 'react-tag-input';
import * as l10n from '../../../lib/l10n';
import {getUUID} from '../../../lib/util';

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
   * Returns a CSS class for the tag object
   * @param {bool} success shall be tag should be successfull (green)
   * @returns {string} CSS tag for the recepient
   */
  const getTagColorClass = success => `tag-${success ? 'success' : (props.extraKey ? 'info' : 'danger')}`;

  /**
   *
   * @param {Recipient} recipient
   * @returns {Tag}
   */
  function recipientToTag(recipient) {
    return {
      id: recipient.email,
      text: recipient.displayId,
      className: getTagColorClass(recipient.key),
      recipient
    };
  }

  /**
   * Verifies a recipient after input, gets their key, colors the
   * input tag accordingly and checks if encryption is possible.
   * @param  {Object|Recipient} data
   * @returns {Recipient}
   */
  function createRecipient(data) {
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
      // no local key found ... lookup on the server
      autoLocate(recipient);
    }
    return recipient;
  }

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

  /**
   * Checks if all recipients have a public key and prevents encryption
   * if one of them does not have a key.
   */
  function checkEncryptStatus() {
    // TODO this seems like a bit of an extra work
    const hasError = tags.some(t => !t.recepient.key) && !props.extraKey;
    setHasError(hasError && !props.hideErrorMsg);
    props.onChangeRecipient && props.onChangeRecipient({hasError});
  }

  /**
   * Do a search with the autoLocate module
   * if a key was not found in the local keyring.
   * @param  {Recipient} recipient   The recipient object
   * @return {undefined}
   */
  function autoLocate(recipient) {
    recipient.checkedServer = true;
    this.props.onAutoLocate(recipient);
  }

  const [tags, setTags] = useState(
    props.recipients.map(r => recipientToTag(props, r))
  );
  const [hasError, setHasError] = useState(false);
  const onDelete = useCallback(tagIndex => {
    setTags(tags.filter((_, i) => i !== tagIndex));
  }, [tags]);

  const onAddition = useCallback(
  /**
   * @param {Tag} newTag
   */
    newTag => {
      if (isEmail(newTag.id)) {
        const recipient = createRecipient(newTag);
        if (recipient.key || recipient.checkedServer) {
          checkEncryptStatus();
        }
        setTags([...tags, recipientToTag(recipient)]);
      }
    },
    [tags]
  );

  /**
   *
   * @param {string} input a string with user input
   * @returns {boolean} if the input string is an email
   */
  function isEmail(input) {
    return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/i.test(input);
  }

  const suggestions = props.keys.map(key => ({
    id: key.email,
    text: `${key.userId} - ${key.keyId}`
  }));

  return (
    <div id={id} className={`recipients-input ${hasError ? 'has-error' : ''}`}>
      <ReactTags
        tags={tags}
        suggestions={suggestions}
        handleDelete ={onDelete}
        handleAddition ={onAddition}
        placeholder={undefined}
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
