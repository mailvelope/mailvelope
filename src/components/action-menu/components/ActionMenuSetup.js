/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';
import Trans from '../../util/Trans';

l10n.register([
  'action_menu_configure_mailvelope',
  'action_menu_more_options',
  'action_menu_setup_menu_aria_label'
]);

function ActionMenuSetup(props) {
  return (
    <div className="primary">
      <ul className="action-menu" role="menu" aria-label={l10n.map.action_menu_setup_menu_aria_label}>
        <li className="item-big" role="menuitem">
          <a className="clearfix" id="setup-keys" onClick={props.onMenuItemClickHandler} role="button">
            <p><Trans id={l10n.map.action_menu_configure_mailvelope} components={[<strong key="0"></strong>]} /></p>
            <i className="fa fa-gear" role="presentation"></i>
          </a>
        </li>
      </ul>
      <div className="footer">
        <a id="options" onClick={props.onMenuItemClickHandler} role="button">
          {l10n.map.action_menu_more_options}
        </a>
      </div>
    </div>
  );
}

ActionMenuSetup.propTypes = {
  onMenuItemClickHandler: PropTypes.func
};

export default ActionMenuSetup;
