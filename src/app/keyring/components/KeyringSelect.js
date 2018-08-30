/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import mvelo from '../../../mvelo';
import './KeyringSelect.css';
import * as l10n from "../../../lib/l10n";
import * as app from '../../app';

l10n.register([
  'preferred'
]);

export default class KeyringSelect extends React.Component {

  constructor(props) {
    super(props);
    this.state = {names: []};
  }

  componentDidUpdate(prevProps) {
    if (this.props.keyringAttr && !prevProps.keyringAttr) {
      this.fetchKeyringEmails();
    }
  }

  async fetchKeyringEmails() {
    let names = [];
    let promises = [];
    Object.keys(this.props.keyringAttr || {}).map((keyringId, index) => {
      promises[index] = this.formatKeyringEmail(keyringId);
    });
    promises = await Promise.all(promises);
    Object.keys(this.props.keyringAttr || {}).map((keyringId, index) => {
      names[keyringId] = promises[index];
    });
    this.setState({names});
  }

  getKeyringName(keyringId) {
    let name;
    if (keyringId === mvelo.MAIN_KEYRING_ID) {
      name = 'Mailvelope';
      if (!this.props.prefs.general.prefer_gnupg) {
        name = `${name} (${l10n.map.preferred})`;
      }
    } else if (keyringId === mvelo.GNUPG_KEYRING_ID) {
      name = 'GnuPG';
      if (this.props.prefs.general.prefer_gnupg) {
        name = `${name} (${l10n.map.preferred})`;
      }
    } else {
      name = keyringId.split(mvelo.KEYRING_DELIMITER)[0];
    }
    return name;
  }

  getKeyringEmail(keyringId) {
    return this.state.names[keyringId] || '...';
  }

  async formatKeyringEmail(keyringId) {
    let fingerprint = this.props.keyringAttr[keyringId].default_key;
    let email = false;
    try {
      const keyDetails = await app.keyring('getKeyDetails', {keyringId, fingerprint});
      email = keyDetails.users[0].userId;
    } catch(error) {
      email = false;
    }
    if (!email) {
      return keyringId.split(mvelo.KEYRING_DELIMITER)[1];
    }
    return email;
  }

  getKeyringThumbnail(keyringId) {
    if (keyringId === mvelo.MAIN_KEYRING_ID) {
      return '../../../img/cryptography-icon48.png';
    }
    if (keyringId === mvelo.GNUPG_KEYRING_ID) {
      return '../../../img/gnupg-icon48.png';
    }
    if (this.props.keyringAttr[keyringId].logo_data_url) {
      return this.props.keyringAttr[keyringId].logo_data_url;
    }
    return '../../../img/default-provider-icon48.png';
  }

  render() {
    return (
      <div className="keyringSelect dropdown">
        { (Object.keys(this.props.keyringAttr || {}).length > 1) &&
        <div>
          <button className="btn btn-default dropdown-toggle" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
            <span className="caret pull-right"></span>
            <span className="keyringIdentifiers">
              <span className="keyringIdentifier keyRingPicture">
                <img src={this.getKeyringThumbnail(this.props.keyringId)} alt="keyring thumbnail" />
              </span>
              <span className="keyringIdentifier keyRingName">{this.getKeyringName(this.props.keyringId)}</span>
              <span className="keyringIdentifier keyRingPrimaryKey">{this.getKeyringEmail(this.props.keyringId)}</span>
            </span>
          </button>
          <ul className="dropdown-menu keyringList" role="menu">
            {Object.keys(this.props.keyringAttr || {}).map((keyringId, index) => {
              const keyringName = this.getKeyringName(keyringId);
              const keyringEmail = this.getKeyringEmail(keyringId);
              return (
                <li key={index} role="menuitem" className="flex-container">
                  <a onClick={() => this.props.onChange(keyringId)} tabIndex="0" className="flex-item keyringIdentifiers">
                    <span className="keyringIdentifier keyRingPicture">
                      <img src={this.getKeyringThumbnail(keyringId)} alt="keyring thumbnail"/>
                    </span>
                    <span className="keyringIdentifier keyRingName">{keyringName}</span>
                    <span className="keyringIdentifier keyRingPrimaryKey">{keyringEmail}</span>
                  </a>
                  {keyringId !== mvelo.MAIN_KEYRING_ID &&
                  <a onClick={() => this.props.onDelete(keyringId, keyringName)}
                     className="btn btn-link pull-right flex-item deleteKeyRing">
                    <span className="glyphicon glyphicon-trash"></span>
                  </a>
                  }
                </li>
              );
            })
            }
          </ul>
        </div>
        }
      </div>
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
