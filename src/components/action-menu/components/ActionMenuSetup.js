/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';
import Trans from '../../util/Trans';
import EventHandler from '../../../lib/EventHandler';

l10n.register([
  'action_menu_configure_mailvelope',
  'action_menu_setup_menu_aria_label',
  'action_menu_setup_start_label'
]);

export default class ActionMenuSetup extends React.Component {
  constructor(props) {
    super(props);
    this.port = EventHandler.connect('menu-59edbbeb9affc4004a916276');
    this.handleClickThrough = this.handleClickThrough.bind(this);
  }

  handleClickThrough(event) {
    this.props.onMenuItemClickHandler(event);
  }

  render() {
    return (
      <>
        <div className="action-menu-content card-body" role="menu" aria-label={l10n.map.action_menu_setup_menu_aria_label}>
          <img src="../../../img/Mailvelope/seal.svg" className=" mx-auto d-block mb-3" alt="..." />
          <p><Trans id={l10n.map.action_menu_configure_mailvelope} components={[<strong key="0"></strong>]} /></p>
        </div>
        <div className="action-menu-footer card-footer text-center pt-1 pb-4">
          <button type="button" className="btn btn-primary" id="analytics-consent" role="button" onClick={this.handleClickThrough}>{l10n.map.action_menu_setup_start_label}</button>
        </div>
      </>
    );
  }
}

ActionMenuSetup.propTypes = {
  onMenuItemClickHandler: PropTypes.func
};
