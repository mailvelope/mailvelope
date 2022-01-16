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
  'editor_encrypt_button',
  'editor_extra_key_checkbox',
  'editor_extra_key_help',
  'editor_key_auto_sign',
  'editor_key_auto_sign_link',
  'editor_key_no_sign_option',
  'editor_sign_button',
  'form_cancel',
  'form_submit',
  'learn_more_link',
  'options_home',
  'sign_dialog_header'
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
            <div className="form-group row mb-3">
              <label htmlFor="signingKey" className="col-sm-4 col-form-label">{l10n.map.sign_dialog_header}</label>
              <div className="col-sm-8">
                <select id="signingKey" className="custom-select form-control" value={this.props.signMsg ? this.props.signKey : 'nosign'} onChange={event => this.props.onChangeSignKey(event.target.value)}>
                  <option value="nosign">{l10n.map.editor_key_no_sign_option}</option>
                  {this.props.privKeys.map(key => <option value={key.fingerprint} key={key.fingerprint}>{`${key.userId} - ${key.keyId}`}</option>)}
                </select>
                <small className="form-text text-muted"><span>{l10n.map.editor_key_auto_sign}</span> <a role="button" href="#" onClick={this.props.onClickSignSetting}>{l10n.map.editor_key_auto_sign_link}</a></small>
              </div>
            </div>
            <div className="form-group row mb-2">
              <label htmlFor="extraKeyInput" className="col-sm-4 col-form-label">
                <div className="custom-control custom-checkbox">
                  <input className="custom-control-input" type="checkbox" id="extraKeyCheck" name="extraKey" checked={this.props.extraKey} onChange={this.props.onExtraKey} />
                  <label className="custom-control-label" htmlFor="extraKeyCheck"><span>{l10n.map.editor_extra_key_checkbox}</span></label>
                </div>
              </label>
              {this.props.extraKey &&
                <div id="extraKeyInput" className="col-sm-8">
                  {this.props.extraKeyInput}
                  <small className="form-text text-muted"><span>{l10n.map.editor_extra_key_help}</span>. <a href="https://www.mailvelope.com/faq#editor_extra_key" target="_blank" rel="noopener noreferrer">{l10n.map.learn_more_link}</a></small>
                </div>
              }
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
            <button type="button" onClick={this.props.onOk} className="btn btn-primary" disabled={this.props.encryptDisabled}>
              <span>{this.props.integration ? l10n.map.form_submit : l10n.map.editor_encrypt_button}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}

EditorModalFooter.propTypes = {
  encryptDisabled: PropTypes.bool, // encrypt action disabled
  extraKey: PropTypes.bool, // extra key input enabled
  extraKeyInput: PropTypes.element, // extra keys input control
  integration: PropTypes.bool, // integration active indicator
  onCancel: PropTypes.func, // click on cancel button
  onChangeSignKey: PropTypes.func, // user selects new key
  onClickSignSetting: PropTypes.func, // click on navigation link
  onExtraKey: PropTypes.func, // click on extra key checkbox
  onOk: PropTypes.func, // click on encrypt button
  onSignOnly: PropTypes.func, // click on sign only button
  privKeys: PropTypes.array, // list of private keys for signing
  signKey: PropTypes.string, // sign key id
  signMsg: PropTypes.bool // sign message indicator
};

