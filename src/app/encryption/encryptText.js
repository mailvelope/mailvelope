/**
 * Copyright (C) 2017-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import * as l10n from '../../lib/l10n';
import {port} from '../app';
import Editor from '../../components/editor/editor';

import './encrypt.css';

l10n.register([
  'text_compose_header',
  'text_result_header',
  'editor_encrypt_button',
  'form_back'
]);

export default class EncryptText extends React.Component {
  constructor() {
    super();
    this.state = {
      editorId: '',
      armored: ''
    };
    port.send('encrypt-text-init')
    .then(editorId => this.setState({editorId}));
  }

  handleEncrypt() {
    port.send('encrypt-text')
    .then(({armored}) => {
      this.setState({armored});
    });
  }

  handleBack() {
    this.setState({armored: ''});
  }

  render() {
    return (
      <>
        <div className={`card ${this.state.armored ? 'd-none' : ''}`}>
          <div className="card-header">
            {l10n.map.text_compose_header}
          </div>
          <div className="card-body" style={{height: '400px'}}>
            <div className="itemSelection encrypt-text-editor" style={{height: '100%'}}>
              {this.state.editorId &&  <Editor id={this.state.editorId} embedded={true} recipientInput={true} secureBackground={false} maxFileUploadSize={5 * 1024 * 1024} />}
            </div>
          </div>
          <div className="card-footer d-flex justify-content-end">
            <button type="button" onClick={() => this.handleEncrypt()} className="btn btn-primary btn-sm">{l10n.map.editor_encrypt_button}</button>
          </div>
        </div>
        <div className={`card ${this.state.armored ? '' : 'd-none'}`}>
          <div className="card-header">
            {l10n.map.text_result_header}
          </div>
          <div className="card-body" style={{height: '400px'}}>
            <textarea className="form-control" value={this.state.armored} rows={12} autoFocus spellCheck="false" autoComplete="off" readOnly
              style={{width: '100%', height: '100%', marginBottom: 0, color: 'black', resize: 'none', fontFamily: 'monospace'}}
            />
          </div>
          <div className="card-footer d-flex justify-content-end">
            <button type="button" onClick={() => this.handleBack()} className="btn btn-sm btn-secondary">{l10n.map.form_back}</button>
          </div>
        </div>
      </>
    );
  }
}
