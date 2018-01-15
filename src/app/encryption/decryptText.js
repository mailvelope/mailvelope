/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import mvelo from '../../mvelo';
import * as l10n from '../../lib/l10n';
import {port} from '../app';
import Alert from '../../components/util/Alert';

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
      error: null,
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
      <div>
        <div className={`panel panel-default ${this.state.decryptId ? 'hide' : 'show'}`}>
          <div className="panel-heading">
            <h3 className="panel-title"><span>{l10n.map.text_paste_armored_header}</span></h3>
          </div>
          <div className="panel-body" style={{height: '400px'}}>
            <textarea className="form-control" value={this.state.armored} onChange={event => this.setState({armored: event.target.value})} rows={12} autoFocus spellCheck="false" autoComplete="off"
              style={{width: '100%', height: '100%', marginBottom: 0, color: 'black', resize: 'none', fontFamily: 'monospace'}}
            />

          </div>
          <div className="panel-footer text-right">
            <button onClick={() => this.handleDecrypt()} className="btn btn-primary btn-sm">{l10n.map.text_decrypt_button}</button>
          </div>
        </div>
        <div className={`panel panel-default ${this.state.decryptId ? 'show' : 'hide'}`}>
          <div className="panel-heading">
            <h3 className="panel-title"><span>{l10n.map.decrypt_popup_title}</span></h3>
          </div>
          <div className="panel-body" style={{height: '400px'}}>
            {this.state.decryptId &&  <iframe src={mvelo.runtime.getURL(`components/decrypt-inline/decryptInline.html?id=${this.state.decryptId}`)} frameBorder={0} style={{overflowY: 'hidden', scrolling: 'no', width: '100%', height: '100%'}} />}
            {this.state.error && <Alert />}
          </div>
          <div className="panel-footer text-right">
            <button onClick={() => this.handleBack()} className="btn btn-sm btn-default">{l10n.map.form_back}</button>
          </div>
        </div>
      </div>
    );
  }
}
