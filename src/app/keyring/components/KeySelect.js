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
        <button type="button" className="btn btn-default btn-sm dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
          {this.state.selectedIndex === 0 ? (
            <strong>{l10n.map.keygrid_primary_key}</strong>
          ) : (
            l10n.map.keygrid_subkey
          )}
          <span className="caret pull-right"></span>
          <span className="margin-left-md text-muted"><em>{selectedKey.keyId}</em></span>
        </button>
        <ul className="dropdown-menu">
          <li className="text-left"><a onClick={() => this.handleClick(0)}><strong>{l10n.map.keygrid_primary_key}</strong> <span className="margin-left-md text-muted"><em>{this.props.keys[0].keyId}</em></span></a></li>
          {this.props.keys.length > 1 &&
            <li role="separator" className="divider"></li>
          }
          {this.props.keys.length > 1 &&
            this.props.keys.filter((key, index) => index > 0).map((key, index) =>
              <li key={index + 1} className="text-left"><a onClick={() => this.handleClick(index + 1)}>{l10n.map.keygrid_subkey} <span className="margin-left-md text-muted"><em>{key.keyId}</em></span></a></li>
            )
          }
        </ul>
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
