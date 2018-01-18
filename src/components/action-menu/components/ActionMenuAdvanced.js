/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
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
  'action_menu_advanced_menu_aria_label'
]);

function ActionMenuAdvanced(props) {
  return (
    <div className="advanced">
      <div className="header">
        <a onClick={props.onShowBaseOptionsHandler} role="button">
          <i className="glyphicon glyphicon-chevron-left" role="presentation"></i>
          {l10n.map.action_menu_back}
        </a>
      </div>
      <ul className="action-menu" role="menu" aria-label={l10n.map.action_menu_advanced_menu_aria_label}>
        <li className="with-icon" role="menuitem">
          <a className="clearfix" id="security-logs" onClick={props.onMenuItemClickHandler} role="button">
            <p>{l10n.map.action_menu_review_security_logs}</p>
            <i className="fa fa-eye" role="presentation"></i>
          </a>
        </li>
        <li className="with-icon" role="menuitem">
          <a className="clearfix" id="email-providers" onClick={props.onMenuItemClickHandler} role="button">
            <p>{l10n.map.action_menu_manage_email_providers}</p>
            <i className="fa fa-server" role="presentation"></i>
          </a>
        </li>
        <li className="with-icon" role="menuitem">
          <a className="clearfix" id="security-settings" onClick={props.onMenuItemClickHandler} role="button">
            <p>{l10n.map.action_menu_edit_security_settings}</p>
            <i className="fa fa-lock" role="presentation"></i>
          </a>
        </li>
        <li className="with-icon" role="menuitem">
          <a className="clearfix" id="reload-extension" onClick={props.onMenuItemClickHandler} role="button">
            <p>{l10n.map.action_menu_reload_extension_scripts}</p>
            <i className="fa fa-refresh" role="presentation"></i>
          </a>
        </li>
        <li className="with-icon" role="menuitem">
          <a className="clearfix" id="activate-tab" onClick={props.onMenuItemClickHandler} role="button">
            <p>{l10n.map.action_menu_activate_current_tab}</p>
            <i className="fa fa-plus" role="presentation"></i>
          </a>
        </li>
      </ul>
      <div className="footer">
        <a id="options" onClick={props.onMenuItemClickHandler} role="button">
          {l10n.map.action_menu_all_options}
        </a>
      </div>
    </div>
  );
}

ActionMenuAdvanced.propTypes = {
  onShowBaseOptionsHandler: PropTypes.func,
  onMenuItemClickHandler: PropTypes.func
};

export default ActionMenuAdvanced;
