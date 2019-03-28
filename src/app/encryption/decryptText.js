/**
 * Copyright (C) 2017-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import * as l10n from '../../lib/l10n';
import {port} from '../app';
import DecryptMessage from '../../components/decrypt-message/DecryptMessage';

import './encrypt.css';

l10n.register([
  'text_paste_armored_header',
  'decrypt_popup_title',
  'text_decrypt_button',
  'form_back'
]);

export default class DecryptText extends React.Component {
  constructor() {
    super();
    this.state = {
      decryptId: '',
      armored: ''
    };
  }

  handleDecrypt() {
    port.send('decrypt-text-init')
    .then(decryptId => {
      this.setState({decryptId});
      port.emit('decrypt-text', {armored: this.state.armored});
    });
  }

  handleBack() {
    this.setState({decryptId: ''});
  }

  render() {
    return (
      <>
        <div className={`card ${this.state.decryptId ? 'd-none' : ''}`}>
          <div className="card-header">
            {l10n.map.text_paste_armored_header}
          </div>
          <div className="card-body" style={{height: '400px'}}>
            <textarea className="form-control" value={this.state.armored} onChange={event => this.setState({armored: event.target.value})} rows={12} autoFocus spellCheck="false" autoComplete="off"
              style={{width: '100%', height: '100%', marginBottom: 0, color: 'black', resize: 'none', fontFamily: 'monospace'}}
            />
          </div>
          <div className="card-footer d-flex justify-content-end">
            <button type="button" onClick={() => this.handleDecrypt()} className="btn btn-primary btn-sm">{l10n.map.text_decrypt_button}</button>
          </div>
        </div>
        <div className={`card ${this.state.decryptId ? '' : 'd-none'}`}>
          <div className="card-header">
            {l10n.map.decrypt_popup_title}
          </div>
          <div className="card-body decrypt-text-message" style={{height: '400px'}}>
            {this.state.decryptId &&  <DecryptMessage id={this.state.decryptId} secureBackground={false} />}
          </div>
          <div className="card-footer d-flex justify-content-end">
            <button type="button" onClick={() => this.handleBack()} className="btn btn-sm btn-secondary">{l10n.map.form_back}</button>
          </div>
        </div>
      </>
    );
  }
}
