/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
// import ActionMenuBase from './ActionMenuBase';
// import ActionMenuAdvanced from './ActionMenuAdvanced';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';
// import $ from 'jquery';

l10n.register([
  'action_menu_dashboard_label',
  'action_menu_dashboard_description',
  'action_menu_keyring_label',
  'action_menu_keyring_description',
  'action_menu_file_encryption_label',
  'action_menu_file_encryption_description',
  'action_menu_review_security_logs_label',
  'action_menu_review_security_logs_description',
  'action_menu_advanced_options',
  'action_menu_primary_menu_aria_label',
  'action_menu_reload_extension_scripts',
  'action_menu_activate_current_tab'
]);

export default function ActionMenuAnimated(props) {
  return (
    <>
      <div className="action-menu-content list-group list-group-flush" role="menu" aria-label={l10n.map.action_menu_primary_menu_aria_label}>
        <a className="action-menu-item list-group-item list-group-item-action" id="options" role="menuitem" onClick={props.onMenuItemClickHandler}>
          <div className="action-menu-item-title d-flex align-items-center"><i className="fa fa-tachometer" role="presentation"></i> <strong>{l10n.map.action_menu_dashboard_label}</strong></div>
          <p>{l10n.map.action_menu_dashboard_description}</p>
        </a>
        <a className="action-menu-item list-group-item list-group-item-action" id="manage-keys" role="menuitem" onClick={props.onMenuItemClickHandler}>
          <div className="action-menu-item-title d-flex align-items-center"><i className="fa fa-key" role="presentation"></i> <strong>{l10n.map.action_menu_keyring_label}</strong></div>
          <p>{l10n.map.action_menu_keyring_description}</p>
        </a>
        <a className="action-menu-item list-group-item list-group-item-action" id="encrypt-file" role="menuitem" onClick={props.onMenuItemClickHandler}>
          <div className="action-menu-item-title d-flex align-items-center"><i className="fa fa-files-o" role="presentation"></i> <strong>{l10n.map.action_menu_file_encryption_label}</strong></div>
          <p>{l10n.map.action_menu_file_encryption_description}</p>
        </a>
        <a className="action-menu-item list-group-item list-group-item-action" id="security-logs" role="menuitem" onClick={props.onMenuItemClickHandler}>
          <div className="action-menu-item-title d-flex align-items-center"><i className="fa fa-eye" role="presentation"></i> <strong>{l10n.map.action_menu_review_security_logs_label}</strong></div>
          <p>{l10n.map.action_menu_review_security_logs_description}</p>
        </a>
      </div>
      <div className="action-menu-footer card-footer">
        <button type="button" onClick={props.onMenuItemClickHandler} id="reload-extension" className="btn btn-sm btn-secondary btn-block"><i className="icon icon-refresh" aria-hidden="true"></i> {l10n.map.action_menu_reload_extension_scripts}</button>
        <button type="button" onClick={props.onMenuItemClickHandler} id="activate-tab" className="btn btn-sm btn-secondary btn-block"><i className="icon icon-add" aria-hidden="true"></i> {l10n.map.action_menu_activate_current_tab}</button>
      </div>
    </>
  );
}

ActionMenuAnimated.propTypes = {
  onMenuItemClickHandler: PropTypes.func
};

