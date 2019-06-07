/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';

l10n.register([
  'action_menu_setup_new_bg_description',
  'action_menu_setup_menu_aria_label',
  'action_menu_setup_start_label'
]);

export default function ActionMenuNewBGSetup(props) {
  return (
    <>
      <div className="action-menu-content card-body" role="menu" aria-label={l10n.map.action_menu_setup_menu_aria_label}>
        <img src="../../../img/Mailvelope/new_bg.svg" className=" mx-auto d-block mb-3" alt="..." />
        <p>{l10n.map.action_menu_setup_new_bg_description}</p>
      </div>
      <div className="action-menu-footer card-footer text-center pt-1 pb-4">
        <button type="button" className="btn btn-primary" id="setup-new-bg" role="button" onClick={props.onMenuItemClickHandler}>{l10n.map.action_menu_setup_start_label}</button>
      </div>
    </>
  );
}

ActionMenuNewBGSetup.propTypes = {
  onMenuItemClickHandler: PropTypes.func
};

