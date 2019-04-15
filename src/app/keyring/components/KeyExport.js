/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import {port} from '../../app';
import React from 'react';
import PropTypes from 'prop-types';
import Alert from '../../../components/util/Alert';

l10n.register([
  'keyring_public',
  'keyring_private',
  'key_export_dialog_question',
  'keygrid_all_keys',
  'key_export_create_file',
  'header_warning',
  'key_export_warning_private',
  'key_export_dialog_copy_to_clipboard'
]);

export default class KeyExport extends React.Component {
  constructor(props) {
    super(props);
    const type = props.publicOnly ? 'pub' : props.type;
    this.state = {
      type,
      keys: [],
      fileName: `${props.keyName.replace(/\s/g, '_')}_${type}.asc`
    };
    this.fileURL = '';
    this.handleClickExport = this.handleClickExport.bind(this);
    this.handleCopyToClipboard = this.handleCopyToClipboard.bind(this);
  }

  async componentDidMount() {
    const keys = await port.send('getArmoredKeys', {keyringId: this.props.keyringId, keyFprs: this.props.keyFprs, options: {pub: true, priv: !this.props.publicOnly, all: this.props.all}});
    this.setState({keys});
  }

  handleTypeChange(type) {
    this.setState({type, fileName: `${this.props.keyName.replace(/\s/g, '_')}_${type}.asc`});
  }

  handleClickExport() {
    this.exportLink.click();
  }

  handleCopyToClipboard() {
    this.textarea.select();
    document.execCommand('copy');
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
    const file = new File([armoredExport], this.state.fileName, {type: 'application/pgp-keys'});
    this.fileURL = window.URL.createObjectURL(file);
    return (
      <div>
        {
          this.state.keys.some(key => key.armoredPrivate) &&
          <div>
            <p>{l10n.map.key_export_dialog_question}</p>
            <div className="btn-group btn-group-toggle d-flex mb-3" data-toggle="buttons">
              <label className={`btn btn-primary ${type === 'pub' ? 'active' : ''} w-100`} onClick={() => this.handleTypeChange('pub')}>
                <input type="radio" name="public" defaultChecked={type === 'pub'} />
                {l10n.map.keyring_public}
              </label>
              <label className={`btn btn-primary ${type === 'priv' ? 'active' : ''} w-100`} onClick={() => this.handleTypeChange('priv')}>
                <input type="radio" name="private" defaultChecked={type === 'priv'} />
                {l10n.map.keyring_private}
              </label>
              <label className={`btn btn-primary ${type === 'all' ? 'active' : ''} w-100`} onClick={() => this.handleTypeChange('all')}>
                <input type="radio" name="all" defaultChecked={type === 'all'} />
                {l10n.map.keygrid_all_keys}
              </label>
            </div>
          </div>
        }
        {
          type !== 'pub' &&
          <Alert type="warning" header={l10n.map.header_warning}>
            {l10n.map.key_export_warning_private}
          </Alert>
        }
        <div className="form-group">
          <textarea ref={node => this.textarea = node} style={{'resize': 'none', 'backgroundColor': '#FFF'}} id="armoredKey" className="form-control" rows="13" value={armoredExport} spellCheck="false" autoComplete="off" readOnly></textarea>
        </div>
        <div className="btn-bar justify-content-between">
          <button type="button" className="btn btn-secondary" onClick={this.props.onClose}>{l10n.map.dialog_popup_close}</button>
          {type === 'pub' && <button type="button" className="btn btn-primary" onClick={this.handleCopyToClipboard}>{l10n.map.key_export_dialog_copy_to_clipboard}</button>}
          <button type="button" className="btn btn-primary" onClick={this.handleClickExport}>{l10n.map.key_export_create_file}</button>
        </div>
        <a className="d-none" download={this.state.fileName} href={this.fileURL} ref={node => this.exportLink = node}></a>
      </div>
    );
  }
}

KeyExport.propTypes = {
  keyringId: PropTypes.string,
  keyFprs: PropTypes.array,
  all: PropTypes.bool,
  keyName: PropTypes.string.isRequired,
  type: PropTypes.string,
  publicOnly: PropTypes.bool,
  onClose: PropTypes.func
};

KeyExport.defaultProps = {
  all: false,
  type: 'pub',
  publicOnly: false
};
