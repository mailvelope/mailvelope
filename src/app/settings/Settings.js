/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import {Route} from 'react-router-dom';
import PropTypes from 'prop-types';
import {NavPill} from '../util/util';
import * as l10n from '../../lib/l10n';
import Notifications from '../../components/util/Notifications';

import General from './General';
import Security from './Security';
import SecurityBackground from './SecurityBackground';
import WatchList from './WatchList';
import SecurityLog from './SecurityLog';
import KeyServer from './keyserver';
import Provider from './Provider';
import Analytics from './Analytics';

l10n.register([
  'settings_analytics',
  'settings_general',
  'settings_keyserver',
  'settings_provider',
  'settings_security',
  'settings_security_background',
  'settings_security_log',
  'settings_watchlist'
]);

export default class Settings extends React.Component {
  constructor() {
    super();
    this.state = {
      notifications: []
    };
    this.handleSetNotification = this.handleSetNotification.bind(this);
  }

  handleSetNotification({header = null, message, type = null, hideDelay = 5500}) {
    const notification = {id: Date.now(), header, message, hideDelay, type};
    this.setState(prevState => ({notifications: [...prevState.notifications, notification]}));
  }

  render() {
    return (
      <>
        <div className="jumbotron">
          <section className="card mv-options">
            <div className="card-body">
              <div className="row">
                <div className="col-md-4 col-lg-3 mb-4">
                  <div role="navigation">
                    <div className="nav flex-column nav-pills" id="v-pills-tab" role="tablist" aria-orientation="vertical">
                      <NavPill to="/settings/general">{l10n.map.settings_general}</NavPill>
                      <NavPill to="/settings/watchlist">{l10n.map.settings_watchlist}</NavPill>
                      <NavPill to="/settings/security">{l10n.map.settings_security}</NavPill>
                      <NavPill to="/settings/security-background">{l10n.map.settings_security_background}</NavPill>
                      <NavPill to="/settings/provider">{l10n.map.settings_provider}</NavPill>
                      <NavPill to="/settings/security-log">{l10n.map.settings_security_log}</NavPill>
                      <NavPill to="/settings/key-server">{l10n.map.settings_keyserver}</NavPill>
                      <NavPill to="/settings/analytics">{l10n.map.settings_analytics}</NavPill>
                    </div>
                  </div>
                </div>
                <div className="col-md-8 col-lg-9">
                  <Route path="/settings/general" component={General} />
                  <Route path="/settings/provider" render={({location}) => <Provider onSetNotification={this.handleSetNotification} location={location} />} />
                  <Route path="/settings/security" render={() => <Security onSetNotification={this.handleSetNotification} />} />
                  <Route path="/settings/security-background" render={() => <SecurityBackground prefs={this.props.prefs} onChangePrefs={this.props.onChangePrefs} />} />
                  <Route path="/settings/watchlist" component={WatchList} />
                  <Route path="/settings/security-log" component={SecurityLog} />
                  <Route path="/settings/key-server" render={() => <KeyServer prefs={this.props.prefs} onChangePrefs={this.props.onChangePrefs} />} />
                  <Route path="/settings/analytics" component={Analytics} />
                </div>
              </div>
            </div>
          </section>
        </div>
        <Notifications items={this.state.notifications} />
      </>
    );
  }
}

Settings.propTypes = {
  onChangePrefs: PropTypes.func,
  prefs: PropTypes.object
};
