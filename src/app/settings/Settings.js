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

import General from './general';
import Security from './Security';
import SecurityBackground from './SecurityBackground';
import WatchList from './watchList';
import SecurityLog from './securityLog';
import KeyServer from './keyserver';

l10n.register([
  'settings_general',
  'settings_watchlist',
  'settings_security',
  'settings_security_background',
  'settings_security_log',
  'settings_keyserver',
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
                <div className="col-lg-3 mb-4">
                  <div role="navigation">
                    <div className="nav flex-column nav-pills" id="v-pills-tab" role="tablist" aria-orientation="vertical">
                      <NavPill to="/settings/general">{l10n.map.settings_general}</NavPill>
                      <NavPill to="/settings/watchlist">{l10n.map.settings_watchlist}</NavPill>
                      <NavPill to="/settings/security">{l10n.map.settings_security}</NavPill>
                      <NavPill to="/settings/security-background">{l10n.map.settings_security_background}</NavPill>
                      <NavPill to="/settings/security-log">{l10n.map.settings_security_log}</NavPill>
                      <NavPill to="/settings/key-server">{l10n.map.settings_keyserver}</NavPill>
                    </div>
                  </div>
                </div>
                <div className="col-lg-9">
                  <Route path='/settings/general' component={General} />
                  <Route path='/settings/watchlist' component={WatchList} />
                  <Route path='/settings/security' render={() => <Security onSetNotification={this.handleSetNotification} />} />
                  <Route path='/settings/security-background' component={SecurityBackground} />
                  <Route path='/settings/security-log' component={SecurityLog} />
                  <Route path='/settings/key-server' render={() => <KeyServer prefs={this.props.prefs} onChangePrefs={this.props.onChangePrefs} onSetNotification={this.handleSetNotification} />} />
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
