/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';

import mvelo from '../../mvelo';
import * as app from '../app';
import event from '../util/event';
import * as l10n from '../../lib/l10n';
import React from 'react';

import KeySearch from './components/KeySearch';
import Alert from '../util/components/Alert';

const PUBLIC_KEY_REGEX = /-----BEGIN PGP PUBLIC KEY BLOCK-----[\s\S]+?-----END PGP PUBLIC KEY BLOCK-----/g;
const PRIVATE_KEY_REGEX = /-----BEGIN PGP PRIVATE KEY BLOCK-----[\s\S]+?-----END PGP PRIVATE KEY BLOCK-----/g;
const MAX_KEY_IMPORT_SIZE = 10000000;

l10n.register([
  'key_import_error',
  'key_import_too_big',
  'key_import_invalid_text',
  'key_import_exception',
  'alert_header_warning',
  'alert_header_success',
  'keyring_import_keys',
  'key_import_file',
  'key_import_file_select',
  'key_import_textarea',
  'key_import_multiple_keys',
  'form_import',
  'form_clear'
]);

class ImportKey extends React.Component {
  constructor(props) {
    super(props);
    this.state = {alert: [], armored: ''};
    this.handleChangeFile = this.handleChangeFile.bind(this);
    this.handleClear = this.handleClear.bind(this);
  }

  handleClear() {
    this.setState({alert: [], armored: ''});
  }

  handleChangeFile(event) {
    let alert = [];
    const reader = new FileReader();
    const file = event.target.files[0];
    if (!file) {
      return;
    }
    reader.onloadend = ev => this.handleImportKey(ev.target.result);
    if (file.size > MAX_KEY_IMPORT_SIZE) {
      alert.push({header: l10n.map.key_import_error, message: l10n.map.key_import_too_big, type: 'danger'});
    } else {
      reader.readAsText(file);
    }
    this.setState({alert});
    // reset input field
    event.target.value = null;
  }

  importKey(armored) {
    this.setState({armored});
    return this.handleImportKey(armored);
  }

  handleImportKey(armored) {
    let alert = [];
    return Promise.resolve()
    .then(() => {
      if (armored.length > MAX_KEY_IMPORT_SIZE) {
        throw {message: l10n.map.key_import_too_big, type: 'error'};
      }
      // find all public and private keys in the textbox
      let publicKeys = armored.match(PUBLIC_KEY_REGEX);
      let privateKeys = armored.match(PRIVATE_KEY_REGEX);
      let keys = [];
      if (publicKeys) {
        publicKeys.forEach(pub => {
          pub = mvelo.util.decodeQuotedPrint(pub);
          keys.push({type: 'public', armored: pub});
        });
      }
      if (privateKeys) {
        privateKeys.forEach(priv => {
          priv = mvelo.util.decodeQuotedPrint(priv);
          keys.push({type: 'private', armored: priv});
        });
      }
      if (!keys.length) {
        throw {message: l10n.map.key_import_invalid_text, type: 'error'};
      }
      return app.keyring('importKeys', [keys])
      .then(result => {
        let success = false;
        result.forEach(imported => {
          let header;
          let {type, message} = imported;
          switch (imported.type) {
            case 'success':
              header = l10n.map.alert_header_success;
              success = true;
              break;
            case 'warning':
              header = l10n.map.alert_header_warning;
              break;
            case 'error':
              header = l10n.map.key_import_error;
              type = 'danger';
              break;
          }
          alert.push({header, message, type});
        });
        if (success) {
          event.triggerHandler('keygrid-reload');
        }
        this.setState({alert});
        return result;
      })
    })
    .catch(error => {
      alert.push({header: l10n.map.key_import_error, message: error.type === 'error' ? error.message : l10n.map.key_import_exception, type: 'danger'});
      this.setState({alert});
      return [{type: 'error'}];
    });
  }

  render() {
    return (
      <div>
        <h3>
          <span>{l10n.map.keyring_import_keys}</span>
          <span className="third-party-logo"></span>
        </h3>
        {
          !app.isDemail && <KeySearch />
        }
        <form className="form" autoComplete="off">
          <div className="form-group">
            <label className="control-label" htmlFor="selectFileButton"><h4>{l10n.map.key_import_file}</h4></label>
            <div>
              <button id="selectFileButton" type="button" onClick={() => this.fileInput.click()} className="btn btn-info">{l10n.map.key_import_file_select}</button>
              <input type="file" onChange={this.handleChangeFile} style={{display: 'none'}} ref={node => this.fileInput = node} />
            </div>
          </div>
          <div className="form-group">
            <label className="control-label" htmlFor="newKey"><h4>{l10n.map.key_import_textarea}</h4></label>
            <div>{l10n.map.key_import_multiple_keys}</div>
            <div className="help-block">
              <textarea id="newKey" value={this.state.armored} onChange={event => this.setState({armored: event.target.value})} style={{width: '100%', fontFamily: 'monospace'}} className="form-control" rows="12" spellCheck="false" autoComplete="false"></textarea>
            </div>
          </div>
          <div className="form-group">
            <button type="button" onClick={() => this.handleImportKey(this.state.armored)} className="btn btn-primary" disabled={!this.state.armored}>{l10n.map.form_import}</button>
            <button type="button" onClick={this.handleClear} className="btn btn-default" disabled={!this.state.armored}>{l10n.map.form_clear}</button>
          </div>
          <div className="form-group">
            {this.state.alert.map((alert, index) => <Alert header={alert.header} message={alert.message} type={alert.type} key={index}/>)}
          </div>
        </form>
      </div>
    );
  }
}

export default ImportKey;
