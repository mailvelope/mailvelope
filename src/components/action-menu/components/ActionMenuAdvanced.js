/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React, {Component} from 'react';
import * as l10n from '../../../lib/l10n';
import PropTypes from 'prop-types';

l10n.register([
  'action_menu_back',
  'action_menu_all_options',
  'action_menu_review_security_logs',
  'action_menu_manage_email_providers',
  'action_menu_edit_security_settings',
  'action_menu_reload_extension_scripts',
  'action_menu_activate_current_tab',
]);

class ActionMenuAdvanced extends Component {
  render() {
    return (
      <div className="advanced">
        <div className="header">
          <a href="#" onClick={this.props.onShowBaseOptionsHandler} aria-role="button">
            <i className="glyphicon glyphicon-chevron-left"></i>
            {l10n.map.action_menu_back}
          </a>
        </div>
        <ul className="action-menu">
          <li role="presentation" className="with-icon">
            <a href="#" className="clearfix" id="security-logs" onClick={this.props.onMenuItemClickHandler}>
              <p>{l10n.map.action_menu_review_security_logs}</p>
              <i className="fa fa-eye"></i>
            </a>
          </li>
          <li role="presentation" className="with-icon">
            <a href="#" className="clearfix" id="email-providers" onClick={this.props.onMenuItemClickHandler}>
              <p>{l10n.map.action_menu_manage_email_providers}</p>
              <i className="fa fa-server"></i>
            </a>
          </li>
          <li role="presentation" className="with-icon">
            <a href="#" className="clearfix" id="security-settings" onClick={this.props.onMenuItemClickHandler}>
              <p>{l10n.map.action_menu_edit_security_settings}</p>
              <i className="fa fa-lock"></i>
            </a>
          </li>
          <li role="presentation" className="with-icon">
            <a href="#" className="clearfix" id="reload-extension" onClick={this.props.onMenuItemClickHandler}>
              <p>{l10n.map.action_menu_reload_extension_scripts}</p>
              <i className="fa fa-refresh"></i>
            </a>
          </li>
          <li role="presentation" className="with-icon">
            <a href="#" className="clearfix" id="activate-tab" onClick={this.props.onMenuItemClickHandler}>
              <p>{l10n.map.action_menu_activate_current_tab}</p>
              <i className="fa fa-plus"></i>
            </a>
          </li>
        </ul>
        <div className="footer">
          <a href="#" id="options" onClick={this.props.onMenuItemClickHandler}>
            {l10n.map.action_menu_all_options}
          </a>
        </div>
      </div>
    );
  }
}

ActionMenuAdvanced.propTypes = {
  onShowBaseOptionsHandler: PropTypes.func,
  onMenuItemClickHandler: PropTypes.func
};

export default ActionMenuAdvanced;
