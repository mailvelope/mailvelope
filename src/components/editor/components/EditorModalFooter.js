/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';

import './EditorModalFooter.css';

l10n.register([
  'form_cancel',
  'editor_sign_button',
  'editor_encrypt_button',
  'options_home',
  'sign_dialog_header',
  'general_primary_key_auto_sign'
]);

class EditorModalFooter extends React.Component {
  signSelection() {
    return (
      <form className="sign-msg-option well">
        <div className="form-group">
          <div className="checkbox">
            <label className="checkbox" htmlFor="signMsgOption">
              <input checked={this.props.signMsg} onChange={event => this.props.onChangeSignMsg(event.target.checked)} type="checkbox" id="signMsgOption" />
              <span>{l10n.map.sign_dialog_header}</span>
            </label>
          </div>
        </div>
        <div className="form-group">
          <select className="form-control" value={this.props.signKey} onChange={event => this.props.onChangeSignKey(event.target.value)}>
            {this.props.privKeys.map(key => <option value={key.fingerprint} key={key.fingerprint}>{`${key.userId} - ${key.keyId}`}</option>)}
          </select>
        </div>
        <div className="form-nav-link pull-right">
          <a role="button" onClick={this.props.onClickSignSetting}>{l10n.map.general_primary_key_auto_sign}</a>
        </div>
      </form>
    );
  }

  render() {
    return (
      <div className="editor-modal-footer">
        {this.props.expanded && this.signSelection()}
        <button type="button" onClick={this.props.expanded ? this.props.onCollapse : this.props.onExpand} className="btn btn-default btn-sm pull-left">
          <span>{l10n.map.options_home}</span>&nbsp;&nbsp;
          <span className={`glyphicon glyphicon-collapse-${this.props.expanded ? 'down' : 'up'}`} aria-hidden="true"></span>
        </button>
        <button type="button" onClick={this.props.onSignOnly} className="btn btn-default btn-sm btn-sign-only" disabled={!(this.props.signMsg && this.props.privKeys.length)}>
          <span className="glyphicon glyphicon-pencil" aria-hidden="true"></span>&nbsp;
          <span>{l10n.map.editor_sign_button}</span>
        </button>
        <button type="button" onClick={this.props.onCancel} className="btn btn-default">
          <span className="glyphicon glyphicon-remove" aria-hidden="true"></span>&nbsp;
          <span>{l10n.map.form_cancel}</span>
        </button>
        <button type="button" onClick={this.props.onEncrypt} className="btn btn-primary" disabled={this.props.encryptDisabled}>
          <span className="glyphicon glyphicon-lock" aria-hidden="true"></span>&nbsp;
          <span>{l10n.map.editor_encrypt_button}</span>
        </button>
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
