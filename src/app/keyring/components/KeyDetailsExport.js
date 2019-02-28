/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import {port} from '../../app';
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
    const type = props.publicOnly ? 'pub' : props.type;
    this.state = {
      type,
      keys: [],
      fileName: `${props.keyName.replace(/\s/g, '_')}_${type}.asc`
    };
    this.fileURL = '';
    this.handleClickExport = this.handleClickExport.bind(this);
    this.handleFileNameChange = this.handleFileNameChange.bind(this);
  }

  async componentDidMount() {
    const keys = await port.send('getArmoredKeys', {keyringId: this.props.keyringId, keyFprs: this.props.keyFprs, options: {pub: true, priv: !this.props.publicOnly, all: this.props.all}});
    this.setState({keys});
  }

  handleTypeChange(type) {
    this.setState({type, fileName: `${this.props.keyName.replace(/\s/g, '_')}_${type}.asc`});
  }

  handleFileNameChange(event) {
    this.setState({fileName: event.target.value});
  }

  handleClickExport() {
    this.exportLink.click();
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
          <div className="d-flex mb-3">
            <div className="btn-group btn-group-toggle w-100 mr-1" data-toggle="buttons">
              <label className={`btn btn-success ${type === 'pub' ? 'active' : ''}`} onClick={() => this.handleTypeChange('pub')}>
                <input type="radio" name="public" defaultChecked={type === 'pub'} />
                {l10n.map.keyring_public}
              </label>
            </div>
            <div className="btn-group btn-group-toggle w-100 ml-1" data-toggle="buttons">
              <label className={`btn btn-warning ${type === 'priv' ? 'active' : ''}`} onClick={() => this.handleTypeChange('priv')}>
                <input type="radio" name="private" defaultChecked={type === 'priv'} />
                {l10n.map.keyring_private}
              </label>
              <label className={`btn btn-warning ${type === 'all' ? 'active' : ''}`} onClick={() => this.handleTypeChange('all')}>
                <input type="radio" name="all" defaultChecked={type === 'all'} />
                {l10n.map.keygrid_all_keys}
              </label>
            </div>
          </div>
        }
        <div className="form-group">
          <textarea id="armoredKey" className="form-control" rows="12" value={armoredExport} spellCheck="false" autoComplete="off" readOnly></textarea>
        </div>
        <div className="form-group d-flex align-items-center">
          <input type="text" value={this.state.fileName} onChange={this.handleFileNameChange} className="form-control w-100 mr-2" />
          <button type="button" className="btn btn-primary" onClick={this.handleClickExport}>{l10n.map.key_export_create_file}</button>
          <a className="hide" download={this.state.fileName} href={this.fileURL} ref={node => this.exportLink = node}></a>
        </div>
        {
          this.state.type !== 'pub' &&
          <div id="exportWarn" className="alert alert-warning m-0">
            <strong>{l10n.map.header_warning}</strong> <span>{l10n.map.key_export_warning_private}</span>
          </div>
        }
      </div>
    );
  }
}

KeyDetailsExport.propTypes = {
  keyringId: PropTypes.string,
  keyFprs: PropTypes.array,
  all: PropTypes.bool,
  keyName: PropTypes.string.isRequired,
  type: PropTypes.string,
  publicOnly: PropTypes.bool
};

KeyDetailsExport.defaultProps = {
  type: 'pub',
  publicOnly: false
};
