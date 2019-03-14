/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import * as l10n from '../../../lib/l10n';
import Trans from '../../util/Trans';
import PropTypes from 'prop-types';

l10n.register([
  'action_menu_dashboard',
  'action_menu_keyring',
  'action_menu_file_encryption',
  'action_menu_advanced_options',
  'action_menu_primary_menu_aria_label'
]);

function ActionMenuBase(props) {
  const strong = [<strong key="0"></strong>];
  return (
    <div className="primary">
      <ul className="action-menu" role="menu" aria-label={l10n.map.action_menu_primary_menu_aria_label}>
        <li className="item-big" role="menuitem">
          <a className="clearfix" id="options" onClick={props.onMenuItemClickHandler} role="button">
            <p><Trans id={l10n.map.action_menu_dashboard} components={strong} /></p>
            <i className="fa fa-tachometer" role="presentation"></i>
          </a>
        </li>
        <li className="item-big" role="menuitem">
          <a className="clearfix" id="manage-keys" onClick={props.onMenuItemClickHandler} role="button">
            <p><Trans id={l10n.map.action_menu_keyring} components={strong} /></p>
            <i className="fa fa-key" role="presentation"></i>
          </a>
        </li>
        <li className="item-big" role="menuitem">
          <a className="clearfix" id="encrypt-file" onClick={props.onMenuItemClickHandler} role="button">
            <p><Trans id={l10n.map.action_menu_file_encryption} components={strong} /></p>
            <i className="fa fa-files-o" role="presentation"></i>
          </a>
        </li>
      </ul>
      <div className="footer">
        <a onClick={props.onShowAdvancedOptionsHandler} role="button">
          {l10n.map.action_menu_advanced_options}&nbsp;
          <i className="fa fa-chevron-right" role="presentation"></i>
        </a>
      </div>
    </div>
  );
}

ActionMenuBase.propTypes = {
  onShowAdvancedOptionsHandler: PropTypes.func,
  onMenuItemClickHandler: PropTypes.func
};

export default ActionMenuBase;
