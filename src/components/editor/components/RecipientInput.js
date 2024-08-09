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
 */
/// END DATA TYPES ///

/// UTILS ///
/**
 * 
 * @param {Recipient} recipient
 * @returns {Tag}
 */
function recipientToTag(recipient) {
  return {
    id: recipient.email,
    text: recipient.displayId
  };
}



/// END UTILS ///

/**
 * Component that inputs recipient email
 * @param {Props} props - Component properties
 * @returns {React.JSX.Element}
 */
export function RecipientInput(props) {
  const id = getUUID();

  const [tags, setTags] = useState(
    props.recipients.map(r => ({
      id: r.email,
      text: r.displayId
    }))
  );
  const onDelete = useCallback(tagIndex => {
    setTags(tags.filter((_, i) => i !== tagIndex));
  }, [tags]);

  const onAddition = useCallback(
  /**
   * @param {Tag} newTag
   */
    newTag => {
      if (isEmail(newTag.id)) {
        setTags([...tags, newTag]);
      } else {
        setHasError(true);
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
  const [hasError, setHasError] = useState(false);

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

/**
 * Controller for the recipient input
 * TODO Is going to be removed completely
 */
class RecipientInputCtrl {
  constructor($timeout, props) {
    this._timeout = $timeout;
    this.props = props;
    this.recipients = props.recipients;
  }

  update() {
    this._timeout(() => { // trigger $scope.$digest() after async call
      this.recipients.forEach(this.verify.bind(this));
      this.checkEncryptStatus();
    });
  }

  /**
   * Verifies a recipient after input, gets their key, colors the
   * input tag accordingly and checks if encryption is possible.
   * @param  {Recipient} recipient   The recipient object
   */
  verify(recipient) {
    if (!recipient) {
      return;
    }
    if (recipient.email) {
      // display only address from autocomplete
      recipient.displayId = recipient.email;
    } else {
      // set address after manual input
      recipient.email = recipient.displayId;
    }
    // lookup key in local cache
    recipient.key = this.getKey(recipient);
    if (recipient.key) {
      recipient.fingerprint = recipient.key.fingerprint;
    }
    if (recipient.key || recipient.checkedServer) {
      // color tag only if a local key was found, or after server lookup
      this.colorTag(recipient);
      this.checkEncryptStatus();
    } else {
      // no local key found ... lookup on the server
      this.autoLocate(recipient);
    }
  }

  /**
   * Finds the recipient's corresponding public key and sets it
   * on the 'key' attribute on the recipient object.
   * @param  {Recipient} recipient   The recipient object
   * @return {Key|undefined}         The key object (undefined if none found)
  */
  getKey(recipient) {
    return this.props.keys.find(key => {
      const fprMatch = recipient.fingerprint && key.fingerprint === recipient.fingerprint;
      const emailMatch = key.email && key.email.toLowerCase() === recipient.email.toLowerCase();
      return fprMatch && emailMatch || emailMatch;
    });
  }

  /**
   * Color the recipient's input tag depending on
   * whether they have a key or not.
   * @param  {Recipient} recipient   The recipient object
   */
  colorTag(recipient) {
    this._timeout(() => { // wait for html tag to appear
      const tags = document.querySelectorAll('tags-input li.tag-item');
      for (const tag of tags) {
        if (tag.textContent.indexOf(recipient.email) !== -1) {
          tag.classList.remove('tag-success', 'tag-info', 'tag-danger');
          if (recipient.key) {
            tag.classList.add('tag-success');
          } else {
            tag.classList.add(`tag-${this.props.extraKey ? 'info' : 'danger'}`);
          }
        }
      }
    });
  }

  /**
   * Checks if all recipients have a public key and prevents encryption
   * if one of them does not have a key.
   */
  checkEncryptStatus() {
    const hasError = this.recipients.some(r => !r.key) && !this.props.extraKey;
    this.hasError = hasError && !this.props.hideErrorMsg;
    this.hasExtraKey = this.props.extraKey;
    this.props.onChangeRecipient && this.props.onChangeRecipient({hasError});
  }

  /**
   * Do a search with the autoLocate module
   * if a key was not found in the local keyring.
   * @param  {Recipient} recipient   The recipient object
   * @return {undefined}
   */
  autoLocate(recipient) {
    recipient.checkedServer = true;
    this.props.onAutoLocate(recipient);
  }

  /**
   * Queries the local cache of key objects to find a matching user ID
   * @param  {String} query     The autocomplete query
   * @return {Array<Recipient>} A list of filtered items that match the query
   */
  autocomplete(query) {
    const cache = this.props.keys.map(key => ({
      email: key.email,
      fingerprint: key.fingerprint,
      displayId: `${key.userId} - ${key.keyId}`
    }));
    // filter by display ID and ignore duplicates
    return cache.filter(i => i.displayId.toLowerCase().includes(query.toLowerCase()) &&
        !this.recipients.some(recipient => recipient.email === i.email));
  }
}
