/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import * as l10n from '../../lib/l10n';
import {port} from '../app';
import Editor from '../../components/editor/editor';
import Alert from '../../components/util/Alert';

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
      error: null,
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
      <div>
        <div className={`panel panel-default ${this.state.armored ? 'hide' : 'show'}`}>
          <div className="panel-heading">
            <h3 className="panel-title"><span>{l10n.map.text_compose_header}</span></h3>
          </div>
          <div className="panel-body" style={{height: '400px'}}>
            {this.state.editorId &&  <Editor id={this.state.editorId} embedded={true} recipientInput={true} />}
            {this.state.error && <Alert />}
          </div>
          <div className="panel-footer text-right">
            <button type="button" onClick={() => this.handleEncrypt()} className="btn btn-primary btn-sm">{l10n.map.editor_encrypt_button}</button>
          </div>
        </div>
        <div className={`panel panel-default ${this.state.armored ? 'show' : 'hide'}`}>
          <div className="panel-heading">
            <h3 className="panel-title"><span>{l10n.map.text_result_header}</span></h3>
          </div>
          <div className="panel-body" style={{height: '400px'}}>
            <textarea className="form-control" value={this.state.armored} rows={12} autoFocus spellCheck="false" autoComplete="off"
              style={{width: '100%', height: '100%', marginBottom: 0, color: 'black', resize: 'none', fontFamily: 'monospace'}}
            />
          </div>
          <div className="panel-footer text-right">
            <button type="button" onClick={() => this.handleBack()} className="btn btn-sm btn-default">{l10n.map.form_back}</button>
          </div>
        </div>
      </div>
    );
  }
}
