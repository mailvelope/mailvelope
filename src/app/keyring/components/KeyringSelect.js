/**
 * Copyright (C) 2015-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {Link} from 'react-router-dom';
import {KEYRING_DELIMITER, MAIN_KEYRING_ID, GNUPG_KEYRING_ID} from '../../../lib/constants';
import * as l10n from '../../../lib/l10n';
import {port} from '../../app';

l10n.register([
  'keyring_main',
  'preferred'
]);

export default class KeyringSelect extends React.Component {
  constructor(props) {
    super(props);
    this.state = {names: {}};
  }

  componentDidMount() {
    this.fetchKeyringEmails();
  }

  componentDidUpdate(prevProps) {
    if (Object.keys(this.props.keyringAttr).length !== Object.keys(prevProps.keyringAttr).length) {
      this.fetchKeyringEmails();
    }
  }

  componentWillUnmount() {
    this.setState({names: {}});
  }

  async fetchKeyringEmails() {
    const names = {};
    const keyringIds = Object.keys(this.props.keyringAttr);
    await Promise.all(keyringIds.map(async keyringId => {
      names[keyringId] = await this.formatKeyringEmail(keyringId);
    }));
    this.setState({names});
  }

  getKeyringName(keyringId) {
    let name;
    if (keyringId === MAIN_KEYRING_ID) {
      name = l10n.map.keyring_main;
      if (!this.props.prefs.general.prefer_gnupg) {
        name = `${name} (${l10n.map.preferred})`;
      }
    } else if (keyringId === GNUPG_KEYRING_ID) {
      name = 'GnuPG';
      if (this.props.prefs.general.prefer_gnupg) {
        name = `${name} (${l10n.map.preferred})`;
      }
    } else {
      name = keyringId.split(KEYRING_DELIMITER)[0];
    }
    return name;
  }

  getKeyringEmail(keyringId) {
    return this.state.names[keyringId] || '...';
  }

  async formatKeyringEmail(keyringId) {
    const fingerprint = this.props.keyringAttr[keyringId].default_key;
    let email = false;
    try {
      const keyDetails = await port.send('getKeyDetails', {keyringId, fingerprint});
      email = keyDetails.users[0].userId;
    } catch (error) {
      email = false;
    }
    if (!email) {
      return keyringId.split(KEYRING_DELIMITER)[1];
    }
    return email;
  }

  getKeyringThumbnail(keyringId) {
    if (keyringId === MAIN_KEYRING_ID) {
      return '../../../img/cryptography-icon48.png';
    }
    if (keyringId === GNUPG_KEYRING_ID) {
      return '../../../img/gnupg-icon48.png';
    }
    if (this.props.keyringAttr[keyringId].logo_data_url) {
      return this.props.keyringAttr[keyringId].logo_data_url;
    }
    return '../../../img/default-keyring-icon48.png';
  }

  render() {
    return (
      <>
        {(Object.keys(this.props.keyringAttr).length > 1 && this.props.prefs) &&
        <div id="keyringSelect" className="dropdown">
          <button className="btn btn-light dropdown-toggle d-flex justify-content-between align-items-center text-left px-2" type="button" data-toggle="dropdown" id="dropdownMenuButton" aria-haspopup="true" aria-expanded="true">
            <img src={this.getKeyringThumbnail(this.props.keyringId)} style={{objectFit: 'contain', width: '48px', height: 'auto', maxHeight: '48px'}} />
            <div className="ml-2 flex-grow-1 d-inline-block">
              <h5 className="d-block mb-1">{this.getKeyringName(this.props.keyringId)}</h5>
              <p className="d-block mb-0 small">{this.getKeyringEmail(this.props.keyringId)}</p>
            </div>
          </button>
          <div className="dropdown-menu" aria-labelledby="dropdownMenuButton" role="menu">
            {Object.keys(this.props.keyringAttr).map((keyringId, index) => {
              const keyringName = this.getKeyringName(keyringId);
              const keyringEmail = this.getKeyringEmail(keyringId);
              return (
                <Link key={index} to='/keyring' onClick={() => this.props.onChange(keyringId)} tabIndex="0" className="dropdown-item text-decoration-none px-2 d-flex align-items-center" role="menuitem">
                  <img src={this.getKeyringThumbnail(keyringId)} style={{objectFit: 'contain', width: '48px', height: 'auto', maxHeight: '48px'}} />
                  <div className="ml-2 flex-grow-1 d-inline-block mr-auto">
                    <h5 className="d-block mb-1">{keyringName}</h5>
                    <p className="d-block mb-0 small">{keyringEmail}</p>
                  </div>
                  {keyringId !== MAIN_KEYRING_ID && keyringId !== GNUPG_KEYRING_ID &&
                    <button type="button" onClick={e => { e.stopPropagation(); this.props.onDelete(keyringId, keyringName); }} className="btn btn-secondary mx-2">
                      <i className="icon icon-delete" aria-hidden="true"></i>
                    </button>
                  }
                </Link>
              );
            })
            }
          </div>
        </div>
        }
      </>
    );
  }
}

KeyringSelect.propTypes = {
  keyringId: PropTypes.string,
  keyringAttr: PropTypes.object,
  prefs: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};

KeyringSelect.defaultProps = {
  keyringAttr: {}
};
