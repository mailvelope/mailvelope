/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';

import './KeySelect.css';

l10n.register([
  'keygrid_primary_key',
  'keygrid_subkey'
]);

export default class KeySelect extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedIndex: props.selectedIndex
    };
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick(selectedIndex) {
    this.props.onChange(selectedIndex);
    this.setState({selectedIndex});
  }

  render() {
    const selectedKey = this.props.keys[this.state.selectedIndex];
    return (
      <div className="keySelect dropdown">
        <button className="btn btn-secondary btn-sm dropdown-toggle d-flex align-items-center w-100" type="button" data-toggle="dropdown" id="dropdownMenuButton" aria-haspopup="true" aria-expanded="true">
          <span className="mr-auto">
            {this.state.selectedIndex === 0 ? (
              <span className="font-weight-bolder">{l10n.map.keygrid_primary_key}</span>
            ) : (
              l10n.map.keygrid_subkey
            )}
          </span>
          <span className="small text-right mr-1"><em>{selectedKey.keyId}</em></span>
        </button>
        <div className="dropdown-menu w-100" aria-labelledby="dropdownMenuButton" role="menu">
          <a className="dropdown-item px-2 d-flex w-auto justify-content-between overflow-hidden" onClick={() => this.handleClick(0)}>
            <span className="font-weight-bolder">{l10n.map.keygrid_primary_key}</span>
            <span className="small text-right mr-3"><em>{this.props.keys[0].keyId}</em></span>
          </a>
          {this.props.keys.length > 1 &&
            <div className="dropdown-divider"></div>
          }
          {this.props.keys.length > 1 &&
            this.props.keys.filter((key, index) => index > 0).map((key, index) =>
              <a key={index + 1} className="dropdown-item px-2 d-flex justify-content-between w-auto overflow-hidden" onClick={() => this.handleClick(index + 1)}>
                <span>{l10n.map.keygrid_subkey}</span>
                <span className="small text-right mr-3"><em>{key.keyId}</em></span>
              </a>
            )
          }
        </div>
      </div>
    );
  }
}

KeySelect.propTypes = {
  keys: PropTypes.array,
  selectedIndex: PropTypes.number,
  onChange: PropTypes.func.isRequired,
};

KeySelect.defaultProps = {
  selectedIndex: 0
};
