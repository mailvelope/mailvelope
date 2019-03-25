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
import {showSecurityBackground, terminate} from '../lib/util';
import {APP_TOP_FRAME_ID} from '../lib/constants';
import EventHandler from '../lib/EventHandler';
import {NavLink, NavPill} from './util/util';

import Dashboard from './dashboard/Dashboard';
import Keyring from './keyring/Keyring';
import EncryptFile from './encryption/encryptFile';
import EncryptText from './encryption/encryptText';
import DecryptText from './encryption/decryptText';

import General from './settings/general';
import Security from './settings/security';
import WatchList from './settings/watchList';
import SecurityLog from './settings/securityLog';
import KeyServer from './settings/keyserver';

import './app.css';

l10n.register([
  'encrypting_home',
  'file_encrypting',
  'file_decrypting',
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
  'settings_watchlist',
  'settings_security_log',
  'settings_keyserver',
  'text_encrypting',
  'text_decrypting'
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
    showSecurityBackground(port);
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
      <div>
        <Route exact path="/" render={() => <Redirect to="/keyring" />} />
        <Route exact path="/encryption" render={() => <Redirect to="/encryption/file-encrypt" />} />
        <Route exact path="/settings" render={() => <Redirect to="/settings/general" />} />
        <nav className="navbar fixed-top navbar-expand-md navbar-light bg-white py-3">
          <div className="container">
            <Link to="/dashboard" className="navbar-brand">
              <img src="../img/logo.svg" width="175" height="32" className="d-inline-block align-top" alt="" />
            </Link>
            <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarSupportedContent">
              <ul className="navbar-nav mr-auto">
                <NavLink to="/keyring">{l10n.map.keyring_header}</NavLink>
                <NavLink to="/encryption">{l10n.map.encrypting_home}</NavLink>
                <NavLink to="/settings">{l10n.map.options_home}</NavLink>
              </ul>
              <ul className="navbar-nav">
                <li className="nav-item"><a className="nav-link" href="https://www.mailvelope.com/help" target="_blank" rel="noreferrer noopener" tabIndex="0">{l10n.map.options_docu}</a></li>
                <li className="nav-item"><a className="nav-link" href="https://www.mailvelope.com/about" target="_blank" rel="noreferrer noopener" tabIndex="0">{l10n.map.options_about}</a></li>
              </ul>
            </div>
          </div>
        </nav>
        <main className="container" role="main">
          <AppOptions.Provider value={{gnupg: this.state.gnupg}}>
            <Route path='/dashboard' component={Dashboard} />
            <Route path='/keyring' render={() => <Keyring prefs={this.state.prefs} />} />
            <Route path='/encryption' render={() => (
              <div className="jumbotron secureBackground">
                <section className="card">
                  <div className="card-body" id="encrypting">
                    <div className="card-title">
                      <h1>{l10n.map.encrypting_home}</h1>
                    </div>
                    <div className="row">
                      <div className="col-lg-3 mb-4">
                        <div role="navigation">
                          <div className="nav flex-column nav-pills" id="v-pills-tab" role="tablist" aria-orientation="vertical">
                            <NavPill to="/encryption/file-encrypt">{l10n.map.file_encrypting}</NavPill>
                            <NavPill to="/encryption/file-decrypt">{l10n.map.file_decrypting}</NavPill>
                            <hr className="w-100" />
                            <NavPill to="/encryption/text-encrypt">{l10n.map.text_encrypting}</NavPill>
                            <NavPill to="/encryption/text-decrypt">{l10n.map.text_decrypting}</NavPill>
                          </div>
                        </div>
                      </div>
                      <div className="col-lg-9">
                        <Route path='/encryption/file-encrypt' component={EncryptFile} />
                        <Route path='/encryption/file-decrypt' component={EncryptFile} />
                        <Route path='/encryption/text-encrypt' component={EncryptText} />
                        <Route path='/encryption/text-decrypt' component={DecryptText} />
                      </div>
                    </div>
                  </div>
                </section>
                <button type="button" className="btn btn-link float-right secureBgndSettingsBtn lockBtnIcon" title={l10n.map.security_background_button_title} disabled="disabled"></button>
              </div>
            )} />
            <Route path='/settings' render={() => (
              <div className="jumbotron secureBackground">
                <section className="card mv-options">
                  <div className="card-body">
                    <div className="row">
                      <div className="col-lg-3 mb-4">
                        <div role="navigation">
                          <div className="nav flex-column nav-pills" id="v-pills-tab" role="tablist" aria-orientation="vertical">
                            <NavPill to="/settings/general">{l10n.map.settings_general}</NavPill>
                            <NavPill to="/settings/security">{l10n.map.settings_security}</NavPill>
                            <NavPill to="/settings/watchlist">{l10n.map.settings_watchlist}</NavPill>
                            <NavPill to="/settings/security-log">{l10n.map.settings_security_log}</NavPill>
                            <NavPill to="/settings/key-server">{l10n.map.settings_keyserver}</NavPill>
                          </div>
                        </div>
                      </div>
                      <div className="col-lg-9">
                        <Route path='/settings/general' component={General} />
                        <Route path='/settings/security' component={Security} />
                        <Route path='/settings/watchlist' component={WatchList} />
                        <Route path='/settings/security-log' component={SecurityLog} />
                        <Route path='/settings/key-server' render={() => <KeyServer prefs={this.state.prefs} onChangePrefs={this.handleChangePrefs} />} />
                      </div>
                    </div>
                  </div>
                </section>
                <button type="button" className="btn btn-link float-right secureBgndSettingsBtn lockBtnIcon" title={l10n.map.security_background_button_title} disabled="disabled"></button>
              </div>

            )} />
          </AppOptions.Provider>
        </main>
        <footer className="container">
          <div className="d-flex justify-content-between">
            <p className="mb-0">&copy; 2012-2019 Mailvelope GmbH</p>
            <p id="version" className="d-sm-none d-md-block mb-0">{this.state.version}</p>
          </div>
        </footer>
      </div>
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
