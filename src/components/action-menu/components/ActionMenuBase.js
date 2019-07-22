/**
 * Copyright (C) 2017-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';

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

export default function ActionMenuBase(props) {
  return (
    <>
      <div className="action-menu-content list-group list-group-flush" role="menu" aria-label={l10n.map.action_menu_primary_menu_aria_label}>
        <a className="action-menu-item list-group-item list-group-item-action" id="dashboard" role="menuitem" onClick={props.onMenuItemClickHandler}>
          <div className="action-menu-item-title d-flex align-items-center"><img src="../../img/Mailvelope/dashboard.svg" role="presentation" /> <strong>{l10n.map.action_menu_dashboard_label}</strong></div>
          <p>{l10n.map.action_menu_dashboard_description}</p>
        </a>
        <a className="action-menu-item list-group-item list-group-item-action" id="manage-keys" role="menuitem" onClick={props.onMenuItemClickHandler}>
          <div className="action-menu-item-title d-flex align-items-center"><img src="../../img/Mailvelope/keyring.svg" role="presentation" /> <strong>{l10n.map.action_menu_keyring_label}</strong></div>
          <p>{l10n.map.action_menu_keyring_description}</p>
        </a>
        <a className="action-menu-item list-group-item list-group-item-action" id="encrypt-file" role="menuitem" onClick={props.onMenuItemClickHandler}>
          <div className="action-menu-item-title d-flex align-items-center"><img src="../../img/Mailvelope/encryption.svg" role="presentation" /> <strong>{l10n.map.action_menu_file_encryption_label}</strong></div>
          <p>{l10n.map.action_menu_file_encryption_description}</p>
        </a>
        <a className="action-menu-item list-group-item list-group-item-action" id="security-logs" role="menuitem" onClick={props.onMenuItemClickHandler}>
          <div className="action-menu-item-title d-flex align-items-center"><img src="../../img/Mailvelope/clipboard.svg" role="presentation" /> <strong>{l10n.map.action_menu_review_security_logs_label}</strong></div>
          <p>{l10n.map.action_menu_review_security_logs_description}</p>
        </a>
      </div>
      <div className="action-menu-footer card-footer">
        <button type="button" onClick={props.onMenuItemClickHandler} id="reload-extension" className="btn btn-sm btn-secondary btn-block"><span className="icon icon-refresh" aria-hidden="true"></span> {l10n.map.action_menu_reload_extension_scripts}</button>
        <button type="button" onClick={props.onMenuItemClickHandler} id="activate-tab" className="btn btn-sm btn-secondary btn-block"><span className="icon icon-add" aria-hidden="true"></span> {l10n.map.action_menu_activate_current_tab}</button>
      </div>
    </>
  );
}

ActionMenuBase.propTypes = {
  onMenuItemClickHandler: PropTypes.func
};

