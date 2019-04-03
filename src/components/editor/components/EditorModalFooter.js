/**
 * Copyright (C) 2016-2019 Mailvelope GmbH
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
  'general_default_key_auto_sign'
]);

export default function EditorModalFooter(props) {
  return (
    <div className="d-flex flex-column w-100">
      <div className="collapse" id="sign-msg-option">
        <form className="card mb-3" style={{fontSize: '0.875rem'}}>
          <div className="card-body p-2 overflow-hidden">
            <div className="form-inline">
              <div className="custom-control custom-checkbox custom-control-inline mr-2 mb-1">
                <input className="custom-control-input" type="checkbox" id="signMsgOption" onChange={event => props.onChangeSignMsg(event.target.checked)} checked={props.signMsg} />
                <label className="custom-control-label" htmlFor="signMsgOption">{l10n.map.sign_dialog_header}</label>
              </div>
              <select className="custom-select custom-select-sm mb-1" value={props.signKey} onChange={event => props.onChangeSignKey(event.target.value)}>
                {props.privKeys.map(key => <option value={key.fingerprint} key={key.fingerprint}>{`${key.userId} - ${key.keyId}`}</option>)}
              </select>
            </div>
            <div>
              <a role="button" href="#" onClick={props.onClickSignSetting}>{l10n.map.general_default_key_auto_sign}</a>
            </div>
          </div>
        </form>
      </div>
      <div className="d-flex align-items-center">
        <button type="button" data-toggle="collapse" data-target="#sign-msg-option" aria-expanded="false" aria-controls="sign-msg-option" className="btn btn-secondary btn-sm mr-auto collapsed">
          <span className="icon" aria-hidden="true"></span>&nbsp;
          <span>{l10n.map.options_home}</span>
        </button>
        <button type="button" onClick={props.onSignOnly} className="btn btn-secondary mr-1" disabled={!(props.signMsg && props.privKeys.length)}>
          <span>{l10n.map.editor_sign_button}</span>
        </button>
        <button type="button" onClick={props.onCancel} className="btn btn-secondary mr-1">
          <span>{l10n.map.form_cancel}</span>
        </button>
        <button type="button" onClick={props.onEncrypt} className="btn btn-primary" disabled={props.encryptDisabled}>
          <span>{l10n.map.editor_encrypt_button}</span>
        </button>
      </div>
    </div>
  );
}

EditorModalFooter.propTypes = {
  onCancel: PropTypes.func, // click on cancel button
  onSignOnly: PropTypes.func, // click on sign only button
  onEncrypt: PropTypes.func, // click on encrypt button
  encryptDisabled: PropTypes.bool, // encrypt action disabled
  signMsg: PropTypes.bool, // sign message indicator
  onChangeSignMsg: PropTypes.func, // receives bool value for current signMsg state
  signKey: PropTypes.string, // sign key id
  privKeys: PropTypes.array, // list of private keys for signing
  onChangeSignKey: PropTypes.func, // user selects new key
  onClickSignSetting: PropTypes.func // click on navigation link
};

