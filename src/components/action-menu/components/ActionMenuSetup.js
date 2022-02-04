/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';
import Trans from '../../util/Trans';
import {PROVIDER_CAMPAIGN} from '../../../lib/analytics';
import EventHandler from '../../../lib/EventHandler';

l10n.register([
  'action_menu_analytics_consent',
  'action_menu_configure_mailvelope',
  'action_menu_setup_menu_aria_label',
  'action_menu_setup_start_label',
  'learn_more_link',
]);

export default class ActionMenuSetup extends React.Component {
  constructor(props) {
    super(props);
    // TODO: can/should this come in via props?
    this.port = EventHandler.connect('menu-59edbbeb9affc4004a916276');
    // TODO: Capture whether consent was denied previously
    this.state = {
      providerAnalyticsConsent: true,
    };
    this.handleClickThrough = this.handleClickThrough.bind(this);
    this.handleChange = this.handleChange.bind(this);
  }

  handleClickThrough(event) {
    console.log('clickthrough', this.state);
    if (this.state.providerAnalyticsConsent) {
      this.port.emit('grant-consent', [PROVIDER_CAMPAIGN]);
    } else {
      this.port.emit('deny-consent', [PROVIDER_CAMPAIGN]);
    }
    this.props.onMenuItemClickHandler(event);
  }

  handleChange(event) {
    const target = event.target;
    this.setState(() => {
      const update = {
        [target.name]: target.checked,
        modified: true,
      };
      return update;
    });
  }

  render() {
    return (
      <>
        <div className="action-menu-content card-body" role="menu" aria-label={l10n.map.action_menu_setup_menu_aria_label}>
          <img src="../../../img/Mailvelope/seal.svg" className=" mx-auto d-block mb-3" alt="..." />
          <p><Trans id={l10n.map.action_menu_configure_mailvelope} components={[<strong key="0"></strong>]} /></p>
        </div>
        <div className="action-menu-footer card-footer text-center pt-1 pb-4">
          <button type="button" className="btn btn-primary" id="setup-keys" role="button" onClick={this.handleClickThrough}>{l10n.map.action_menu_setup_start_label}</button>
          <div className="action-menu-control card-body">
            <input className="custom-control-input" type="checkbox" checked={this.state.providerAnalyticsConsent} onChange={this.handleChange} id="providerAnalyticsConsent" name="providerAnalyticsConsent"></input>
            <label className="custom-control-label" htmlFor="providerAnalyticsConsent"><Trans id={l10n.map.action_menu_analytics_consent} /> <a href="https://www.mailvelope.com/faq#analytics" target="_blank" rel="noopener noreferrer">{l10n.map.learn_more_link}</a></label>
          </div>
        </div>
      </>
    );
  }
}

ActionMenuSetup.propTypes = {
  onMenuItemClickHandler: PropTypes.func,
};
