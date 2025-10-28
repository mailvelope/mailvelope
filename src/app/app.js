/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012-2018 Mailvelope GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {withRouter, Route, Redirect} from 'react-router-dom';
import * as l10n from '../lib/l10n';
import {APP_TOP_FRAME_ID} from '../lib/constants';
import EventHandler from '../lib/EventHandler';
import Navigation from './Navigation';
import SecurityBG from '../components/util/SecurityBG';
import Terminate from '../components/util/Terminate';
import Dashboard from './dashboard/Dashboard';
import Keyring from './keyring/Keyring';
import Encrypt from './encrypt/Encrypt';
import Decrypt from './decrypt/Decrypt';
import Settings from './settings/Settings';
import AnalyticsConsent from './settings/AnalyticsConsent';
import {Onboarding} from '../components/onboarding/onboarding';

import './app.scss';

l10n.register([
  'options_title'
]);

export let port; // EventHandler

export const AppOptions = React.createContext({gnupg: false});

class App extends React.Component {
  constructor(props) {
    super(props);
    const query = new URLSearchParams(document.location.search);
    // init messaging
    port = EventHandler.connect(`app-${this.getId(query)}`);
    port.on('terminate', this.terminate);
    l10n.mapToLocal();
    document.title = l10n.map.options_title;
    // set initial state
    this.state = {
      prefs: null, // global preferences
      gnupg: false, // GnuPG installed
      collapse: false,
      terminate: false,
      version: '' // Mailvelope version
    };
    this.handleChangePrefs = this.handleChangePrefs.bind(this);
    this.toggleNavbar = this.toggleNavbar.bind(this);
  }

  getId(query) {
    if (window.top === window.self) {
      // top level frame
      return APP_TOP_FRAME_ID;
    } else {
      // embedded frame
      let id = query.get('id');
      if (id === APP_TOP_FRAME_ID) {
        id = '';
      }
      return id;
    }
  }

  terminate() {
    this.setState({terminate: true}, () => this.port.disconnect());
  }

  componentDidMount() {
    port.send('get-version')
    .then(version => this.setState({version}));
    port.send('get-prefs')
    .then(prefs => this.setState({prefs}));
    port.send('get-gnupg-status')
    .then(gnupg => this.setState({gnupg}));
  }

  handleChangePrefs(update) {
    return new Promise(resolve => {
      port.send('set-prefs', {prefs: update})
      .then(() => port.send('get-prefs')
      .then(prefs => this.setState({prefs}, () => resolve())));
    });
  }

  toggleNavbar() {
    this.setState(state => ({collapse: !state.collapse}));
  }

  render() {
    const isOnboarding = this.props.location.pathname.startsWith('/onboarding');

    return (
      <SecurityBG port={port}>
        <Route exact path="/" render={() => <Redirect to="/keyring" />} />
        <Route exact path="/encryption" render={() => <Redirect to="/encryption/file-encrypt" />} />
        <Route exact path="/settings" render={() => <Redirect to="/settings/general" />} />

        <Navigation
          showLinks={!isOnboarding}
          prefs={this.state.prefs}
          location={this.props.location}
          collapse={this.state.collapse}
          toggleNavbar={this.toggleNavbar}
        />

        {/* Main content area - only rendered when NOT on onboarding */}
        <main className={`container-lg ${(this.state.prefs && !this.state.prefs.security.personalized && this.props.location.pathname !== '/settings/security-background') ? 'featured' : ''}`} role="main">
          <AppOptions.Provider value={{gnupg: this.state.gnupg}}>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/keyring" render={() => <Keyring prefs={this.state.prefs} />} />
            <Route path="/encrypt" component={Encrypt} />
            <Route path="/decrypt" component={Decrypt} />
            <Route path="/settings" render={() => <Settings prefs={this.state.prefs} onChangePrefs={this.handleChangePrefs} />} />
            <Route path="/analytics-consent" component={AnalyticsConsent} />
            <Route path="/onboarding" render={() => <Onboarding gnupg={this.state.gnupg} />} />
          </AppOptions.Provider>
        </main>

        {/* Footer - always rendered */}
        <footer className="container-lg">
          <div className="d-flex justify-content-between">
            <p><span className="pr-2">&copy; 2025</span><a className="text-reset" href="https://mailvelope.com/about" target="_blank" rel="noreferrer noopener" tabIndex="0">Mailvelope GmbH</a></p>
            <p id="version" className="d-sm-none d-md-block">{this.state.version}</p>
          </div>
        </footer>
        {this.state.terminate && <Terminate />}
      </SecurityBG>
    );
  }
}

App.propTypes = {
  location: PropTypes.object
};

export default withRouter(App);

/**
 * Retrieve slot ID from query parameter and get slot data from background
 * @return {Promise.<String>}
 */
export function getAppDataSlot() {
  const query = new URLSearchParams(document.location.search);
  const slotId = query.get('slotId');
  return port.send('get-app-data-slot', {slotId});
}
