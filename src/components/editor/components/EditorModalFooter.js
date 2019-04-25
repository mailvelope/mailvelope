/**
 * Copyright (C) 2016-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';
import {Collapse} from 'reactstrap';

import './EditorModalFooter.scss';

l10n.register([
  'form_cancel',
  'editor_sign_button',
  'editor_encrypt_button',
  'options_home',
  'sign_dialog_header',
  'general_default_key_no_sign_option',
  'general_default_key_auto_sign',
  'general_default_key_auto_sign_link'
]);

export default class EditorModalFooter extends React.Component {
  constructor(props) {
    super(props);
    this.toggle = this.toggle.bind(this);
    this.state = {collapse: true};
  }

  toggle() {
    this.setState(state => ({collapse: !state.collapse}));
  }

  render() {
    return (
      <div className="d-flex flex-column w-100">
        <Collapse id="sign-msg-option" isOpen={!this.state.collapse}>
          <form className="mb-3">
            <div className="row mb-2">
              <label htmlFor="signingKey" className="col-sm-4 col-form-label">{l10n.map.sign_dialog_header}</label>
              <div className="col-sm-8">
                <select id="signingKey" className="custom-select" value={this.props.signMsg ? this.props.signKey : 'nosign'} onChange={event => this.props.onChangeSignKey(event.target.value)}>
                  <option value="nosign">{l10n.map.general_default_key_no_sign_option}</option>
                  {this.props.privKeys.map(key => <option value={key.fingerprint} key={key.fingerprint}>{`${key.userId} - ${key.keyId}`}</option>)}
                </select>
              </div>
            </div>
            <div className="row">
              <div className="offset-sm-4 col-sm-8">
                <span>{l10n.map.general_default_key_auto_sign}</span> <a role="button" href="#" onClick={this.props.onClickSignSetting}>{l10n.map.general_default_key_auto_sign_link}</a>
              </div>
            </div>
          </form>
        </Collapse>
        <div className="d-flex align-items-center">
          <button type="button" onClick={this.toggle} aria-controls="sign-msg-option" data-target="#sign-msg-option" className={`btn btn-secondary mr-auto ${this.state.collapse ? 'collapsed' : ''}`}>
            <span className="icon" aria-hidden="true"></span>&nbsp;
            <span>{l10n.map.options_home}</span>
          </button>
          <div className="btn-bar">
            <button type="button" onClick={this.props.onSignOnly} className="btn btn-secondary" disabled={!(this.props.signMsg && this.props.privKeys.length)}>
              <span>{l10n.map.editor_sign_button}</span>
            </button>
            <button type="button" onClick={this.props.onCancel} className="btn btn-secondary">
              <span>{l10n.map.form_cancel}</span>
            </button>
            <button type="button" onClick={this.props.onEncrypt} className="btn btn-primary" disabled={this.props.encryptDisabled}>
              <span>{l10n.map.editor_encrypt_button}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}

EditorModalFooter.propTypes = {
  onCancel: PropTypes.func, // click on cancel button
  onSignOnly: PropTypes.func, // click on sign only button
  onEncrypt: PropTypes.func, // click on encrypt button
  encryptDisabled: PropTypes.bool, // encrypt action disabled
  signMsg: PropTypes.bool, // sign message indicator
  signKey: PropTypes.string, // sign key id
  privKeys: PropTypes.array, // list of private keys for signing
  onChangeSignKey: PropTypes.func, // user selects new key
  onClickSignSetting: PropTypes.func // click on navigation link
};

