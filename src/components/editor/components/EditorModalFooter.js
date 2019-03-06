/**
 * Copyright (C) 2016-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';

l10n.register([
  'form_cancel',
  'editor_sign_button',
  'editor_encrypt_button',
  'options_home',
  'sign_dialog_header',
  'general_default_key_auto_sign'
]);

class EditorModalFooter extends React.Component {
  signSelection() {
    return (
      <form className="sign-msg-option card mb-3" style={{fontSize: '0.875rem'}}>
        <div className="card-body p-2">
          <div className="form-inline">
            <div className="custom-control custom-checkbox custom-control-inline mr-2 mb-1">
              <input className="custom-control-input" type="checkbox" id="signMsgOption" onChange={event => this.props.onChangeSignMsg(event.target.checked)} checked={this.props.signMsg} />
              <label className="custom-control-label" htmlFor="signMsgOption">{l10n.map.sign_dialog_header}</label>
            </div>
            <select className="custom-select custom-select-sm mb-1" value={this.props.signKey} onChange={event => this.props.onChangeSignKey(event.target.value)}>
              {this.props.privKeys.map(key => <option value={key.fingerprint} key={key.fingerprint}>{`${key.userId} - ${key.keyId}`}</option>)}
            </select>
          </div>
          <div>
            <a role="button" href="#" onClick={this.props.onClickSignSetting}>{l10n.map.general_default_key_auto_sign}</a>
          </div>
        </div>
      </form>
    );
  }

  render() {
    return (
      <div className="d-flex flex-column w-100">
        {this.props.expanded && this.signSelection()}
        <div className="d-flex align-items-center">
          <button type="button" onClick={this.props.expanded ? this.props.onCollapse : this.props.onExpand} className="btn btn-secondary btn-sm mr-auto">
            <span>{l10n.map.options_home}</span>&nbsp;
            <i className={`fa fa-${this.props.expanded ? 'minus' : 'plus'}-square-o`} aria-hidden="true"></i>
          </button>
          <button type="button" onClick={this.props.onSignOnly} className="btn btn-outline-secondary mr-1" disabled={!(this.props.signMsg && this.props.privKeys.length)}>
            <i className="fa fa-pencil" aria-hidden="true"></i>&nbsp;
            <span>{l10n.map.editor_sign_button}</span>
          </button>
          <button type="button" onClick={this.props.onCancel} className="btn btn-secondary mr-1">
            <i className="fa fa-remove" aria-hidden="true"></i>&nbsp;
            <span>{l10n.map.form_cancel}</span>
          </button>
          <button type="button" onClick={this.props.onEncrypt} className="btn btn-primary" disabled={this.props.encryptDisabled}>
            <i className="fa fa-lock" aria-hidden="true"></i>&nbsp;
            <span>{l10n.map.editor_encrypt_button}</span>
          </button>
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
  onExpand: PropTypes.func, // click on options button in collapsed state
  onCollapse: PropTypes.func, // click on options button in expanded state
  expanded: PropTypes.bool, // expanded state
  signMsg: PropTypes.bool, // sign message indicator
  onChangeSignMsg: PropTypes.func, // receives bool value for current signMsg state
  signKey: PropTypes.string, // sign key id
  privKeys: PropTypes.array, // list of private keys for signing
  onChangeSignKey: PropTypes.func, // user selects new key
  onClickSignSetting: PropTypes.func // click on navigation link
};

export default EditorModalFooter;
