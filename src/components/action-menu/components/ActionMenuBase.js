/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React, {Component} from 'react';
import * as l10n from '../../../lib/l10n';
import PropTypes from 'prop-types';

l10n.register([
  'action_menu_dashboard',
  'action_menu_dashboard_browse_all',
  'action_menu_keyring',
  'action_menu_keyring_manage_keys',
  'action_menu_file_encryption',
  'action_menu_file_encryption_encrypt_file',
  'action_menu_advanced_options'
]);

class ActionMenuBase extends Component {
  render() {
    return (
      <div className="primary">
        <ul className="action-menu">
          <li role="presentation" className="item-big">
            <a href="#" className="clearfix" id="options" onClick={this.props.onMenuItemClickHandler}>
              <p><strong>{l10n.map.action_menu_dashboard}:</strong> {l10n.map.action_menu_dashboard_browse_all}</p>
              <i className="fa fa-tachometer"></i>
            </a>
          </li>
          <li role="presentation" className="item-big">
            <a href="#" className="clearfix" id="manage-keys" onClick={this.props.onMenuItemClickHandler}>
              <p><strong>{l10n.map.action_menu_keyring}:</strong> {l10n.map.action_menu_keyring_manage_keys}</p>
              <i className="fa fa-key"></i>
            </a>
          </li>
          <li role="presentation" className="item-big">
            <a href="#" className="clearfix" id="encrypt-file" onClick={this.props.onMenuItemClickHandler}>
              <p><strong>{l10n.map.action_menu_file_encryption}:</strong> {l10n.map.action_menu_file_encryption_encrypt_file}</p>
              <i className="fa fa-files-o"></i>
            </a>
          </li>
        </ul>
        <div className="footer">
          <a href="#" onClick={this.props.onShowAdvancedOptionsHandler}>
            {l10n.map.action_menu_advanced_options}
            <i className="glyphicon glyphicon-chevron-right"></i>
          </a>
        </div>
      </div>
    );
  }
}

ActionMenuBase.propTypes = {
  onShowAdvancedOptionsHandler: PropTypes.func,
  onMenuItemClickHandler: PropTypes.func
};

export default ActionMenuBase;
