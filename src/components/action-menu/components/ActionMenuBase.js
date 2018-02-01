/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React, {Component} from 'react';
import Trans, * as l10n from '../../../lib/l10n';
import PropTypes from 'prop-types';

l10n.register([
  'action_menu_dashboard',
  'action_menu_keyring',
  'action_menu_file_encryption',
  'action_menu_advanced_options',
  'action_menu_primary_menu_aria_label'
]);

class ActionMenuBase extends Component {
  render() {
    const strong = [<strong key="0"></strong>];
    return (
      <div className="primary">
        <ul className="action-menu" role="menu" aria-label={l10n.map.action_menu_primary_menu_aria_label}>
          <li className="item-big" role="menuitem">
            <a className="clearfix" id="options" onClick={this.props.onMenuItemClickHandler} role="button">
              <p><Trans id={l10n.map.action_menu_dashboard} components={strong} /></p>
              <i className="fa fa-tachometer" role="presentation"></i>
            </a>
          </li>
          <li className="item-big" role="menuitem">
            <a className="clearfix" id="manage-keys" onClick={this.props.onMenuItemClickHandler} role="button">
              <p><Trans id={l10n.map.action_menu_keyring} components={strong} /></p>
              <i className="fa fa-key" role="presentation"></i>
            </a>
          </li>
          <li className="item-big" role="menuitem">
            <a className="clearfix" id="encrypt-file" onClick={this.props.onMenuItemClickHandler} role="button">
              <p><Trans id={l10n.map.action_menu_file_encryption} components={strong} /></p>
              <i className="fa fa-files-o" role="presentation"></i>
            </a>
          </li>
        </ul>
        <div className="footer">
          <a onClick={this.props.onShowAdvancedOptionsHandler} role="button">
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
