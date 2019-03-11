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
import {NavLink} from './util/util';

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
        <nav className="navbar navbar-default navbar-fixed-top">
          <div className="container">
            <div className="navbar-header">
              <button type="button" className="navbar-toggle collapsed" data-toggle="collapse" data-target=".bs-navbar-collapse" aria-expanded="false">
                <span className="sr-only">Toggle navigation</span>
                <span className="icon-bar"></span>
                <span className="icon-bar"></span>
                <span className="icon-bar"></span>
              </button>
              <Link to="/dashboard" className="navbar-brand">Mailvelope</Link>
            </div>
            <div className="collapse navbar-collapse bs-navbar-collapse">
              <ul className="nav navbar-nav" role="menu" aria-label="primary menu">
                <NavLink to="/keyring">{l10n.map.keyring_header}</NavLink>
                <NavLink to="/encryption">{l10n.map.encrypting_home}</NavLink>
                <NavLink to="/settings">{l10n.map.options_home}</NavLink>
              </ul>
              <ul className="nav navbar-nav navbar-right" role="menu" aria-label="primary menu">
                <li role="menuitem"><a href="https://www.mailvelope.com/help" target="_blank" rel="noreferrer noopener" tabIndex="0">{l10n.map.options_docu}</a></li>
                <li role="menuitem"><a href="https://www.mailvelope.com/about" target="_blank" rel="noreferrer noopener" tabIndex="0">{l10n.map.options_about}</a></li>
              </ul>
            </div>
          </div>
        </nav>
        <div className="container" role="main">
          <div className="row">
            <AppOptions.Provider value={{gnupg: this.state.gnupg}}>
              <Route path='/dashboard' component={Dashboard} />
              <Route path='/keyring' render={() => <Keyring prefs={this.state.prefs} />} />
              <Route path='/encryption' render={() => (
                <div>
                  <div className="col-md-3">
                    <div role="navigation">
                      <ul className="nav nav-pills nav-stacked">
                        <NavLink to="/encryption/file-encrypt">{l10n.map.file_encrypting}</NavLink>
                        <NavLink to="/encryption/file-decrypt">{l10n.map.file_decrypting}</NavLink>
                        <li role="separator" className="divider"></li>
                        <NavLink to="/encryption/text-encrypt">{l10n.map.text_encrypting}</NavLink>
                        <NavLink to="/encryption/text-decrypt">{l10n.map.text_decrypting}</NavLink>
                      </ul>
                    </div>
                  </div>
                  <div className="col-md-9">
                    <div className="jumbotron secureBackground">
                      <section className="well">
                        <Route path='/encryption/file-encrypt' component={EncryptFile} />
                        <Route path='/encryption/file-decrypt' component={EncryptFile} />
                        <Route path='/encryption/text-encrypt' component={EncryptText} />
                        <Route path='/encryption/text-decrypt' component={DecryptText} />
                      </section>
                      <button type="button" className="btn btn-link pull-right secureBgndSettingsBtn lockBtnIcon" title={l10n.map.security_background_button_title} disabled="disabled"></button>
                    </div>
                  </div>
                </div>
              )} />
              <Route path='/settings' render={() => (
                <div>
                  <div className="col-md-3">
                    <div role="navigation">
                      <ul className="nav nav-pills nav-stacked">
                        <NavLink to="/settings/general">{l10n.map.settings_general}</NavLink>
                        <NavLink to="/settings/security">{l10n.map.settings_security}</NavLink>
                        <NavLink to="/settings/watchlist">{l10n.map.settings_watchlist}</NavLink>
                        <NavLink to="/settings/security-log">{l10n.map.settings_security_log}</NavLink>
                        <NavLink to="/settings/key-server">{l10n.map.settings_keyserver}</NavLink>
                      </ul>
                    </div>
                  </div>
                  <div className="col-md-9">
                    <div className="jumbotron secureBackground">
                      <section className="well mv-options">
                        <Route path='/settings/general' component={General} />
                        <Route path='/settings/security' component={Security} />
                        <Route path='/settings/watchlist' component={WatchList} />
                        <Route path='/settings/security-log' component={SecurityLog} />
                        <Route path='/settings/key-server' render={() => <KeyServer prefs={this.state.prefs} onChangePrefs={this.handleChangePrefs} />} />
                      </section>
                      <button type="button" className="btn btn-link pull-right secureBgndSettingsBtn lockBtnIcon" title={l10n.map.security_background_button_title} disabled="disabled"></button>
                    </div>
                  </div>
                </div>
              )} />
            </AppOptions.Provider>
          </div>
          <footer className="row">
            <p className="pull-left col-md-6">&copy; 2012-2019 Mailvelope GmbH</p>
            <div id="version" className="pull-right col-md-6">{this.state.version}</div>
          </footer>
        </div>
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
