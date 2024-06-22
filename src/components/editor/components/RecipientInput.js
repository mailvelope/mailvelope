/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

/**
 * Parts of the recipient input is based on Hoodiecrow (MIT License)
 * Copyright (c) 2014 Whiteout Networks GmbH.
 * See https://github.com/tanx/hoodiecrow/blob/master/LICENSE
 */

import React from 'react';
import PropTypes from 'prop-types';
import {getUUID} from '../../../lib/util';
import * as l10n from '../../../lib/l10n';

import './RecipientInput.scss';

/* global angular */

l10n.register([
  'editor_key_has_extra_msg',
  'editor_key_not_found',
  'editor_key_not_found_msg'
]);

/*
  reference to props of RecipientInput will be shared with Angular controller
  this structure is not immutable, recipients will be received as {email},
  but RecipientInputCtrl will modify recipients to {email, keys}
 */
const contrCompStack = [];

export class RecipientInput extends React.Component {
  constructor(props) {
    super(props);
    this.id = getUUID();
  }

  propsOnStack() {
    // store props on stack for Angular
    this.ctrlLink = {props: this.props};
    contrCompStack.push(this.ctrlLink);
  }

  componentDidMount() {
    // load editor module dependencies
    angular.module('recipientInput', ['ngTagsInput'])
    .config((tagsInputConfigProvider, $locationProvider) => {
      // activate monitoring of placeholder option
      tagsInputConfigProvider.setActiveInterpolation('tagsInput', {placeholder: true});
      $locationProvider.hashPrefix('');
    });
    // attach ctrl to editor module
    angular.module('recipientInput').controller('RecipientInputCtrl', RecipientInputCtrl);
    this.propsOnStack();
    // bootstrap angular
    angular.bootstrap(document.getElementById(this.id), ['recipientInput']);
    if (this.ctrlLink.props.recipients.length) {
      this.ctrlLink.rInputCtrl.recipients = this.ctrlLink.props.recipients;
      this.ctrlLink.rInputCtrl.update();
    }
  }

  shouldComponentUpdate(nextProps) {
    this.ctrlLink.props = nextProps;
    this.ctrlLink.rInputCtrl.recipients = this.ctrlLink.props.recipients;
    // only update input controller if recipients or keys change
    if (this.props.recipients !== nextProps.recipients ||
        this.props.keys !== nextProps.keys ||
        this.props.extraKey !== nextProps.extraKey) {
      this.ctrlLink.rInputCtrl.update();
    }
    // no re-rendering of component due to Angular
    return false;
  }

  render() {
    const contrAttr = node => {
      node.setAttribute('ng-controller', 'RecipientInputCtrl as rInput');
      node.setAttribute('ng-class', "{'has-error': rInput.hasError}");
    };
    return (
      <div id={this.id} className="recipients-input" ref={node => node && contrAttr(node)}>
        <tags-input
          ng-model="rInput.recipients"
          type="email"
          key-property="displayId"
          allowed-tags-pattern="[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}"
          spellcheck="false"
          tabindex="0"
          add-on-space="true"
          add-on-enter="true"
          enable-editing-last-tag="true"
          display-property="displayId"
          on-tag-added="rInput.verify($tag)"
          on-tag-removed="rInput.checkEncryptStatus()">
          <auto-complete
            source="rInput.autocomplete($query)"
            min-length="1">
          </auto-complete>
        </tags-input>
        <div className="alert alert-danger ng-hide mb-0" role="alert" ref={node => node && node.setAttribute('ng-show', 'rInput.hasError')}>
          <strong>{l10n.map.editor_key_not_found}</strong> <span>{l10n.map.editor_key_not_found_msg}</span>
        </div>
        <div className="alert alert-info ng-hide mb-0" role="alert" ref={node => node && node.setAttribute('ng-show', 'rInput.hasExtraKey')}>
          <span>{l10n.map.editor_key_has_extra_msg}</span>
        </div>
      </div>
    );
  }
}

RecipientInput.propTypes = {
  extraKey: PropTypes.bool,
  hideErrorMsg: PropTypes.bool,
  keys: PropTypes.array,
  onAutoLocate: PropTypes.func,
  onChangeRecipient: PropTypes.func,
  recipients: PropTypes.array
};

/**
 * Angular controller for the recipient input
 */
export class RecipientInputCtrl {
  constructor($timeout) {
    this._timeout = $timeout;
    this.compLink = contrCompStack.pop();
    this.recipients = this.compLink.props.recipients;
    this.compLink.rInputCtrl = this;
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
   * @param  {Object} recipient   The recipient object
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
   * @param  {Object} recipient   The recipient object
   * @return {Object}             The key object (undefined if none found)
   */
  getKey(recipient) {
    return this.compLink.props.keys.find(key => {
      const fprMatch = recipient.fingerprint && key.fingerprint === recipient.fingerprint;
      const emailMatch = key.email && key.email.toLowerCase() === recipient.email.toLowerCase();
      return fprMatch && emailMatch || emailMatch;
    });
  }

  /**
   * Color the recipient's input tag depending on
   * whether they have a key or not.
   * @param  {Object} recipient   The recipient object
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
            tag.classList.add(`tag-${this.compLink.props.extraKey ? 'info' : 'danger'}`);
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
    const hasError = this.recipients.some(r => !r.key) && !this.compLink.props.extraKey;
    this.hasError = hasError && !this.compLink.props.hideErrorMsg;
    this.hasExtraKey = this.compLink.props.extraKey;
    this.compLink.props.onChangeRecipient && this.compLink.props.onChangeRecipient({hasError});
  }

  /**
   * Do a search with the autoLocate module
   * if a key was not found in the local keyring.
   * @param  {Object} recipient   The recipient object
   * @return {undefined}
   */
  autoLocate(recipient) {
    recipient.checkedServer = true;
    this.compLink.props.onAutoLocate(recipient);
  }

  /**
   * Queries the local cache of key objects to find a matching user ID
   * @param  {String} query   The autocomplete query
   * @return {Array}          A list of filtered items that match the query
   */
  autocomplete(query) {
    const cache = this.compLink.props.keys.map(key => ({
      email: key.email,
      fingerprint: key.fingerprint,
      displayId: `${key.userId} - ${key.keyId}`
    }));
    // filter by display ID and ignore duplicates
    return cache.filter(i => i.displayId.toLowerCase().includes(query.toLowerCase()) &&
        !this.recipients.some(recipient => recipient.email === i.email));
  }
}

// workaround to prevent "Error: class constructors must be invoked with |new|" in Firefox
// https://github.com/angular/angular.js/issues/14240
RecipientInputCtrl.$$ngIsClass = true;
