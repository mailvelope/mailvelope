/**
 * Copyright (C) 2015-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import mvelo from '../../../mvelo';

import './KeyringSelect.css';


class KeyringSelect extends React.Component {
  constructor(props) {
    super(props);
  }

  getKeyringName(keyringId) {
    if (keyringId === mvelo.LOCAL_KEYRING_ID) {
      return 'Mailvelope';
    }
    return keyringId.split(mvelo.KEYRING_DELIMITER)[0] + ' (' + keyringId.split(mvelo.KEYRING_DELIMITER)[1] + ')';
  }

  render() {
    return (
      <div className="dropdown">
        <button className="btn btn-default dropdown-toggle" type="button" data-toggle="dropdown" aria-expanded="true" style={{width: '100%', textAlign: 'left', marginBottom: '10px'}}>
          <span className="caret pull-right" id="keyringSwitcherCaret"></span>
          <span id="keyringSwitcherLabel">{this.getKeyringName(this.props.keyringId)}</span>
        </button>
        <ul className="dropdown-menu" role="menu" id="keyringList">
          {
            Object.keys(this.props.keyringAttr || {}).map((keyringId, index) => {
              const keyringName = this.getKeyringName(keyringId);
              return (
                <li key={index} role="presentation" className="flex-container">
                  <a onClick={() => this.props.onChange(keyringId)} role="menuitem" tabIndex="-1" className="flex-item keyRingName">{keyringName}</a>
                  { keyringId !== mvelo.LOCAL_KEYRING_ID &&
                    <a onClick={() => this.props.onDelete(keyringId, keyringName)} className="btn btn-link pull-right flex-item deleteKeyRing"><span className="glyphicon glyphicon-trash"></span></a>
                  }
                </li>
              )
            })
          }
        </ul>
      </div>
    );
  }
}

KeyringSelect.propTypes = {
  keyringId: PropTypes.string,
  keyringAttr: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
};

export default KeyringSelect;
