/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import {port} from '../../app';
import React from 'react';
import PropTypes from 'prop-types';
import Alert from '../../../components/util/Alert';
import Spinner from '../../../components/util/Spinner';

l10n.register([
  'keyring_public',
  'keyring_private',
  'key_export_dialog_question',
  'keygrid_all_keys',
  'key_export_filename',
  'key_export_create_file',
  'alert_header_warning',
  'key_export_warning_private',
  'key_export_dialog_copy_to_clipboard',
  'dialog_popup_close'
]);

export default class KeyExport extends React.Component {
  constructor(props) {
    super(props);
    const type = props.publicOnly ? 'pub' : props.type;
    this.state = {
      type,
      keys: [],
      armored: '',
      fileName: `${this.props.keyName.replace(/\s/g, '_')}_${type}.asc`
    };
    this.fileURL = '';
    this.handleClickExport = this.handleClickExport.bind(this);
    this.handleFileNameChange = this.handleFileNameChange.bind(this);
    this.handleCopyToClipboard = this.handleCopyToClipboard.bind(this);
  }

  async componentDidMount() {
    const keys = await port.send('getArmoredKeys', {keyringId: this.props.keyringId, keyFprs: this.props.keyFprs, options: {pub: true, priv: !this.props.publicOnly, all: this.props.all}});
    this.setState(prevState => ({keys, armored: this.getArmoredExport(keys, prevState.type)}));
  }

  handleTypeChange(type) {
    this.setState({armored: ''}, () => {
      this.setState(prevState => ({type, armored: this.getArmoredExport(prevState.keys, type), fileName: `${this.props.keyName.replace(/\s/g, '_')}_${type}.asc`}));
    });
  }

  handleFileNameChange(event) {
    this.setState({fileName: event.target.value});
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

  getArmoredExport(keys, type) {
    return keys.reduce((acc, key) => {
      let result = acc;
      if (key.armoredPrivate && (type === 'priv' || type === 'all')) {
        result += `${key.armoredPrivate || ''}\n`;
      }
      if (type === 'pub' || type === 'all') {
        result += key.armoredPublic || '';
      }
      return result;
    }, '');
  }

  getFileSize(number) {
    if (number < 1024) {
      return `${number}bytes`;
    } else if (number >= 1024 && number < 1048576) {
      return `${(number / 1024).toFixed(1)}KB`;
    } else if (number >= 1048576) {
      return `${(number / 1048576).toFixed(1)}MB`;
    }
  }

  render() {
    // create file
    const file = new File([this.state.armored], this.state.fileName, {type: 'application/pgp-keys'});
    this.fileURL = window.URL.createObjectURL(file);
    return (
      <div>
        {this.state.armored === '' ? (
          <Spinner delay={0} />
        ) : (
          <>
            {this.state.keys.some(key => key.armoredPrivate) &&
              <div>
                <p className="mb-2">{l10n.map.key_export_dialog_question}</p>
                <div className="btn-group btn-group-toggle d-flex mb-3" data-toggle="buttons">
                  <label className={`btn btn-${this.state.type === 'pub' ? 'primary' : 'secondary'} w-100`} onClick={() => this.handleTypeChange('pub')}>
                    <input type="radio" name="public" defaultChecked={this.state.type === 'pub'} />
                    {l10n.map.keyring_public}
                  </label>
                  <label className={`btn btn-${this.state.type === 'priv' ? 'primary' : 'secondary'} w-100`} onClick={() => this.handleTypeChange('priv')}>
                    <input type="radio" name="private" defaultChecked={this.state.type === 'priv'} />
                    {l10n.map.keyring_private}
                  </label>
                  <label className={`btn btn-${this.state.type === 'all' ? 'primary' : 'secondary'} w-100`} onClick={() => this.handleTypeChange('all')}>
                    <input type="radio" name="all" defaultChecked={this.state.type === 'all'} />
                    {l10n.map.keygrid_all_keys}
                  </label>
                </div>
              </div>
            }
            {
              this.state.type !== 'pub' &&
              <Alert type="warning" header={l10n.map.alert_header_warning}>
                {l10n.map.key_export_warning_private}
              </Alert>
            }
            {this.props.showArmored &&
              <div className="form-group">
                <textarea ref={node => this.textarea = node} style={{'resize': 'none', 'backgroundColor': '#FFF'}} id="armoredKey" className="form-control" rows="13" value={this.state.armored} spellCheck="false" autoComplete="off" readOnly></textarea>
              </div>
            }
            {this.props.fileNameEditable &&
              <div className="form-inline form-group">
                <label htmlFor="fileName" className="my-1">{l10n.map.key_export_filename}</label>
                <input id="fileName" type="text" value={this.state.fileName} onChange={this.handleFileNameChange} className="form-control flex-grow-1 mx-sm-2" />
                <small className="text-muted">
                  {this.getFileSize(file.size)}
                </small>
              </div>
            }
            <a className="d-none" download={this.state.fileName} href={this.fileURL} ref={node => this.exportLink = node}></a>
          </>
        )}
        <div className="btn-bar justify-content-between">
          <button type="button" className="btn btn-secondary" onClick={this.props.onClose}>{l10n.map.dialog_popup_close}</button>
          {(this.state.type === 'pub' && this.props.showArmored) && <button type="button" className="btn btn-secondary" onClick={this.handleCopyToClipboard}>{l10n.map.key_export_dialog_copy_to_clipboard}</button>}
          <button type="button" className="btn btn-primary" disabled={!this.state.armored} onClick={this.handleClickExport}>{l10n.map.key_export_create_file}</button>
        </div>
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
  showArmored: PropTypes.bool,
  fileNameEditable: PropTypes.bool,
  onClose: PropTypes.func
};

KeyExport.defaultProps = {
  all: false,
  type: 'pub',
  publicOnly: false,
  showArmored: true,
  fileNameEditable: false
};
