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
  'action_menu_setup_menu_aria_label',
  'action_menu_setup_start_label'
]);

export default function ActionMenuSetup(props) {
  return (
    <>
      <div className="action-menu-content card-body" role="menu" aria-label={l10n.map.action_menu_setup_menu_aria_label}>
        <img src="../../../img/Mailvelope/seal.svg" className="mx-auto d-block mb-3" alt="..." />
        <p><Trans id={l10n.map.action_menu_configure_mailvelope} components={[<strong key="0"></strong>]} /></p>
      </div>
      <div className="action-menu-footer card-footer text-center pt-1 pb-4">
        <button type="button" className="btn btn-primary" id="lets-start" role="button" onClick={props.onMenuItemClickHandler}>{l10n.map.action_menu_setup_start_label}</button>
      </div>
    </>
  );
}

ActionMenuSetup.propTypes = {
  onMenuItemClickHandler: PropTypes.func
};
