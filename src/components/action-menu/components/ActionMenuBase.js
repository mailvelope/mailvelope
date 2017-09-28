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
  'action_menu_advanced_options',
  'action_menu_primary_menu_aria_label'
]);

class ActionMenuBase extends Component {
  render() {
    return (
      <div className="primary">
        <ul className="action-menu" role="menu" aria-label={l10n.map.action_menu_primary_menu_aria_label}>
          <li className="item-big" role="none">
            <a href="#" className="clearfix" id="options" onClick={this.props.onMenuItemClickHandler} role="menuitem">
              <p><strong>{l10n.map.action_menu_dashboard}:</strong> {l10n.map.action_menu_dashboard_browse_all}</p>
              <i className="fa fa-tachometer" role="presentation"></i>
            </a>
          </li>
          <li className="item-big" role="none">
            <a href="#" className="clearfix" id="manage-keys" onClick={this.props.onMenuItemClickHandler} role="menuitem">
              <p><strong>{l10n.map.action_menu_keyring}:</strong> {l10n.map.action_menu_keyring_manage_keys}</p>
              <i className="fa fa-key" role="presentation"></i>
            </a>
          </li>
          <li className="item-big" role="none">
            <a href="#" className="clearfix" id="encrypt-file" onClick={this.props.onMenuItemClickHandler} role="menuitem">
              <p><strong>{l10n.map.action_menu_file_encryption}:</strong> {l10n.map.action_menu_file_encryption_encrypt_file}</p>
              <i className="fa fa-files-o" role="presentation"></i>
            </a>
          </li>
        </ul>
        <div className="footer">
          <a href="#" onClick={this.props.onShowAdvancedOptionsHandler} role="button">
            {l10n.map.action_menu_advanced_options}
            <i className="glyphicon glyphicon-chevron-right" role="presentation"></i>
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
