/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {Dropdown, DropdownToggle, DropdownMenu} from 'reactstrap';
import * as l10n from '../../../lib/l10n';

l10n.register([
  'keygrid_primary_key',
  'keygrid_subkey'
]);

export default class KeySelect extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedIndex: props.selectedIndex,
      dropdownOpen: false
    };
    this.handleClick = this.handleClick.bind(this);
    this.toggle = this.toggle.bind(this);
  }

  handleClick(selectedIndex) {
    this.props.onChange(selectedIndex);
    this.setState({selectedIndex});
    this.toggle();
  }

  toggle() {
    this.setState(prevState => ({
      dropdownOpen: !prevState.dropdownOpen
    }));
  }

  render() {
    const selectedKey = this.props.keys[this.state.selectedIndex];
    return (
      <Dropdown isOpen={this.state.dropdownOpen} toggle={this.toggle}>
        <DropdownToggle size="sm" className="d-flex align-items-center" caret>
          <span className="mr-auto">
            {this.state.selectedIndex === 0 ? (
              <span className="font-weight-bolder">{l10n.map.keygrid_primary_key}</span>
            ) : (
              l10n.map.keygrid_subkey
            )}
          </span>
          <span className="text-right mx-1">{selectedKey.keyId}</span>
        </DropdownToggle>
        <DropdownMenu className="py-1" style={{fontSize: '0.765rem'}}>
          <a className="dropdown-item d-flex align-items-center" onClick={() => this.handleClick(0)} style={{cursor: 'pointer', paddingLeft: '0.625rem', paddingRight: '0.625rem'}}>
            <span className="mr-auto font-weight-bolder">{l10n.map.keygrid_primary_key}</span>
            <span className="text-right ml-1 mr-3">{this.props.keys[0].keyId}</span>
          </a>
          {this.props.keys.length > 1 &&
            <div className="dropdown-divider my-1"></div>
          }
          {this.props.keys.length > 1 &&
            this.props.keys.filter((key, index) => index > 0).map((key, index) =>
              <a key={index + 1} className="dropdown-item d-flex align-items-center" onClick={() => this.handleClick(index + 1)} style={{cursor: 'pointer', paddingLeft: '0.625rem', paddingRight: '0.625rem'}}>
                <span className="mr-auto">{l10n.map.keygrid_subkey}</span>
                <span className="text-right ml-1 mr-3">{key.keyId}</span>
              </a>
            )
          }
        </DropdownMenu>
      </Dropdown>
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
