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
import {Route, Redirect, Link} from 'react-router-dom';
import * as l10n from '../lib/l10n';
import {terminate} from '../lib/util';
import {APP_TOP_FRAME_ID} from '../lib/constants';
import EventHandler from '../lib/EventHandler';
import {NavLink, NavPill} from './util/util';
import SecurityBG from '../components/util/SecurityBG';

import Dashboard from './dashboard/Dashboard';
import Keyring from './keyring/Keyring';
import Encrypt from './encrypt/Encrypt';
import Decrypt from './decrypt/Decrypt';

import General from './settings/general';
import Security from './settings/security';
import SecurityBackground from './settings/SecurityBackground';
import WatchList from './settings/watchList';
import SecurityLog from './settings/securityLog';
import KeyServer from './settings/keyserver';

import './app.scss';

l10n.register([
  'encrypt_home',
  'decrypt_home',
  'keyring_header',
  'keyring_display_keys',
  'keyring_import_keys',
  'keyring_generate_key',
  'keyring_setup',
  'options_title',
  'options_home',
  'options_docu',
  'options_about',
  'security_background_button_title',
  'settings_general',
  'settings_security',
  'settings_security_background',
  'settings_watchlist',
  'settings_security_log',
  'settings_keyserver'
]);

export let port; // EventHandler

export const AppOptions = React.createContext({gnupg: false});

export class App extends React.Component {
  constructor(props) {
    super(props);
    const query = new URLSearchParams(document.location.search);
    // init messaging
    port = EventHandler.connect(`app-${this.getId(query)}`);
    port.on('terminate', () => terminate(port));
    l10n.mapToLocal();
    document.title = l10n.map.options_title;
    // set initial state
    this.state = {
      prefs: null, // global preferences
      gnupg: false, // GnuPG installed
      version: '' // Mailvelope version
    };
    this.handleChangePrefs = this.handleChangePrefs.bind(this);
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

  render() {
    return (
      <SecurityBG port={port}>
        <Route exact path="/" render={() => <Redirect to="/keyring" />} />
        <Route exact path="/encryption" render={() => <Redirect to="/encryption/file-encrypt" />} />
        <Route exact path="/settings" render={() => <Redirect to="/settings/general" />} />
        <nav className="navbar fixed-top navbar-expand-md navbar-light bg-white py-3">
          <div className="container">
            <Link to="/dashboard" className="navbar-brand">
              <img src="../img/Mailvelope/logo.svg" width="175" height="32" className="d-inline-block align-top" alt="" />
            </Link>
            <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarSupportedContent">
              <ul className="navbar-nav mr-auto">
                <NavLink to="/keyring">{l10n.map.keyring_header}</NavLink>
                <NavLink to="/encrypt">{l10n.map.encrypt_home}</NavLink>
                <NavLink to="/decrypt">{l10n.map.decrypt_home}</NavLink>
                <NavLink to="/settings">{l10n.map.options_home}</NavLink>
              </ul>
              <ul className="navbar-nav">
                <li className="nav-item"><a className="nav-link" href="https://www.mailvelope.com/help" target="_blank" rel="noreferrer noopener" tabIndex="0"><span className="icon icon-help d-none d-md-inline" aria-hidden="true"></span><span className="d-md-none">{l10n.map.options_docu}</span></a></li>
              </ul>
            </div>
          </div>
        </nav>
        <main className="container" role="main">
          <AppOptions.Provider value={{gnupg: this.state.gnupg}}>
            <Route path='/dashboard' component={Dashboard} />
            <Route path='/keyring' render={() => <Keyring prefs={this.state.prefs} />} />
            <Route path='/encrypt' component={Encrypt} />
            <Route path='/decrypt' component={Decrypt} />
            <Route path='/settings' render={() => (
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
                        <Route path='/settings/security' component={Security} />
                        <Route path='/settings/security-background' component={SecurityBackground} />
                        <Route path='/settings/security-log' component={SecurityLog} />
                        <Route path='/settings/key-server' render={() => <KeyServer prefs={this.state.prefs} onChangePrefs={this.handleChangePrefs} />} />
                      </div>
                    </div>
                  </div>
                </section>
              </div>

            )} />
          </AppOptions.Provider>
        </main>
        <footer className="container">
          <div className="d-flex justify-content-between">
            <p>&copy; 2012-2019 <a className="text-reset" href="https://www.mailvelope.com/de/about" target="_blank" rel="noreferrer noopener" tabIndex="0">Mailvelope GmbH</a></p>
            <p id="version" className="d-sm-none d-md-block">{this.state.version}</p>
          </div>
        </footer>
      </SecurityBG>
    );
  }
}

/**
 * Retrieve slot ID from query parameter and get slot data from background
 * @return {Promise.<String>}
 */
export function getAppDataSlot() {
  const query = new URLSearchParams(document.location.search);
  const slotId = query.get('slotId');
  return port.send('get-app-data-slot', {slotId});
}
