/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import {keyring} from '../../app';
import React from 'react';
import PropTypes from 'prop-types';

l10n.register([
  'keyring_public',
  'keyring_private',
  'keygrid_all_keys',
  'key_export_create_file',
  'header_warning',
  'key_export_warning_private'
]);

export default class KeyDetailsExport extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      type: props.type,
      keys: [],
      fileName: `${props.keyName.replace(/\s/g, '_')}_${props.type}.asc`
    };
    keyring('getArmoredKeys', {keyids: props.keyids, options: {pub: true, priv: true, all: props.all}})
    .then(result => this.setState({keys: result}));
    this.fileURL = '';
    this.handleClickExport = this.handleClickExport.bind(this);
    this.handleFileNameChange = this.handleFileNameChange.bind(this);
  }

  handleTypeChange(type) {
    this.setState({type, fileName: `${this.props.keyName.replace(/\s/g, '_')}_${type}.asc`});
  }

  handleFileNameChange(event) {
    this.setState({fileName: event.target.value});
  }

  handleClickExport() {
    chrome.downloads.download({
      url: this.fileURL,
      filename: this.state.fileName,
      saveAs: true
    });
  }

  componentWillUnmount() {
    window.URL.revokeObjectURL(this.fileURL);
  }

  render() {
    const type = this.state.type;
    const armoredExport = this.state.keys.reduce((acc, key) => {
      let result = acc;
      if (key.armoredPrivate && (type === 'priv' || type === 'all')) {
        result += `${key.armoredPrivate || ''}\n`;
      }
      if (type === 'pub' || type === 'all') {
        result += key.armoredPublic || '';
      }
      return result;
    }, '');
    // create file
    const blob = new Blob([armoredExport], {type: 'application/pgp-keys'});
    this.fileURL = window.URL.createObjectURL(blob);
    return (
      <div>
        {
          this.state.keys.some(key => key.armoredPrivate) &&
          <div>
            <div className="btn-group" data-toggle="buttons" style={{marginBottom: '10px', marginRight: '20px'}}>
              <label className={`btn btn-success ${type === 'pub' ? 'active' : ''}`} onClick={() => this.handleTypeChange('pub')}>
                <input type="radio" name="public" defaultChecked={type === 'pub'} />
                <span>{l10n.map.keyring_public}</span>
              </label>
            </div>
            <div className="btn-group" data-toggle="buttons" style={{marginBottom: '10px'}}>
              <label className={`btn btn-warning ${type === 'priv' ? 'active' : ''}`} onClick={() => this.handleTypeChange('priv')}>
                <input type="radio" name="private" defaultChecked={type === 'priv'} />
                <span>{l10n.map.keyring_private}</span>
              </label>
              <label className={`btn btn-warning ${type === 'all' ? 'active' : ''}`} onClick={() => this.handleTypeChange('all')}>
                <input type="radio" name="all" defaultChecked={type === 'all'} />
                <span>{l10n.map.keygrid_all_keys}</span>
              </label>
            </div>
          </div>
        }
        <div className="form-group">
          <textarea id="armoredKey" className="form-control" rows="12" value={armoredExport} spellCheck="false" autoComplete="off"></textarea>
        </div>
        <div className="form-inline">
          <input type="text" value={this.state.fileName} onChange={this.handleFileNameChange} className="form-control" style={{width: '250px', marginRight: '10px'}} />
          <button type="button" className="btn btn-primary" onClick={this.handleClickExport}>{l10n.map.key_export_create_file}</button>
        </div>
        {
          this.state.type !== 'pub' &&
          <div style={{marginTop: '10px'}} id="exportWarn" className="alert alert-warning">
            <b>{l10n.map.header_warning}</b>&nbsp;
            <span>{l10n.map.key_export_warning_private}</span>
          </div>
        }
      </div>
    );
  }
}

KeyDetailsExport.propTypes = {
  keyids: PropTypes.array,
  all: PropTypes.bool,
  keyName: PropTypes.string.isRequired,
  type: PropTypes.string
};

KeyDetailsExport.defaultProps = {
  type: 'pub'
};
