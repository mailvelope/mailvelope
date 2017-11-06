/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2012-2017 Mailvelope GmbH
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

import mvelo from '../mvelo';
import React from 'react';
import {Route, Redirect, Link} from 'react-router-dom';
import * as l10n from '../lib/l10n';
import {NavLink, ProviderLogo} from './util/util';

import Dashboard from './dashboard/Dashboard';
import KeyringSelect from './keyring/components/KeyringSelect';
import KeyGrid from './keyring/KeyGrid';
import ImportKey from './keyring/importKey';
import GenerateKey from './keyring/GenerateKey';
import KeyringSetup from './keyring/KeyringSetup';

import EncryptFile from './fileEncrypt/encryptFile';

import General from './settings/general';
import Security from './settings/security';
import WatchList from './settings/watchList';
import SecurityLog from './settings/securityLog';
import KeyServer from './settings/keyserver';

import '../res/less/font-awesome.less';
import './app.css';

l10n.register([
  'options_title',
  'security_background_button_title',
  'keyring_header',
  'encrypting_home',
  'options_home',
  'options_docu',
  'options_about',
  'keyring_display_keys',
  'keyring_import_keys',
  'keyring_generate_key',
  'keyring_setup',
  'settings_general',
  'settings_security',
  'settings_watchlist',
  'settings_security_log',
  'settings_keyserver',
  'file_encrypting',
  'file_decrypting'
]);

const DEMAIL_SUFFIX = 'de-mail.de';
export let port; // EventHandler
// reference to app component to get state
let app;

export class App extends React.Component {
  constructor(props) {
    super(props);
    // get URL parameter
    const query = new URLSearchParams(document.location.search);
    const keyringId = query.get('krid') || '';
    const name = query.get('fname') || '';
    const email = query.get('email') || '';
    // init messaging
    port = mvelo.EventHandler.connect('app-bca899655117bff5e264fad');
    l10n.mapToLocal();
    document.title = l10n.map.options_title;
    // set initial state
    this.state = {
      prefs: null, // global preferences
      keyringAttr: null, // keyring meta data
      keyringId, // active keyring: id
      primaryKeyId: '', // active keyring: id of primary key
      hasPrivateKey: false, // active keyring: has private key
      providerLogo: '', // provider specific logo
      isDemail: false, // active keyring: is keyring from de-mail provider
      name, // query parameter to set user name for key generation
      email, // query parameter to set email for key generation
      keys: [], // active keyring: keys
      keyGridSpinner: true, // active keyring: loading spinner
      version: '' // Mailvelope version
    };
    this.handleChangeKeyring = this.handleChangeKeyring.bind(this);
    this.handleDeleteKeyring = this.handleDeleteKeyring.bind(this);
    this.handleDeleteKey = this.handleDeleteKey.bind(this);
    this.handleChangePrimaryKey = this.handleChangePrimaryKey.bind(this);
    this.handleChangePrefs = this.handleChangePrefs.bind(this);
    this.loadKeyring = this.loadKeyring.bind(this);
    this.initMessageListener();
    app = this;
  }

  componentWillMount() {
    this.initActiveKeyring()
    .then(() => this.loadKeyring());
  }

  componentDidMount() {
    port.send('get-version')
    .then(version => this.setState({version}));
    port.send('get-prefs').then(prefs => this.setState({prefs}));
    mvelo.util.showSecurityBackground();
  }

  initActiveKeyring() {
    return new Promise(resolve => {
      if (this.state.keyringId) {
        return resolve();
      }
      port.send('get-active-keyring')
      .then(keyringId => this.setState({keyringId: keyringId || mvelo.LOCAL_KEYRING_ID}, resolve));
    });
  }

  loadKeyring() {
    port.send('get-all-keyring-attr')
    .then(keyringAttr => {
      this.setState(prevState => {
        const keyringId = keyringAttr[prevState.keyringId] ? prevState.keyringId : mvelo.LOCAL_KEYRING_ID;
        const primaryKeyId = keyringAttr[keyringId].primary_key || '';
        const providerLogo = keyringAttr[keyringId].logo_data_url || '';
        const isDemail = keyringId.includes(DEMAIL_SUFFIX);
        // propagate state change to backend
        port.emit('set-active-keyring', {keyringId});
        return {keyringId, primaryKeyId, isDemail, keyringAttr, providerLogo};
      }, () => {
        port.send('getKeys', {keyringId: this.state.keyringId})
        .then(keys => {
          keys = keys.sort((a, b) => a.name.localeCompare(b.name));
          const hasPrivateKey = keys.some(key => key.type === 'private');
          this.setState({hasPrivateKey, keys, keyGridSpinner: false});
        });
      });
    });
  }

  handleChangePrefs(update) {
    return new Promise(resolve => {
      port.send('set-prefs', {prefs: update})
      .then(() => port.send('get-prefs')
      .then(prefs => this.setState({prefs}, () => resolve())));
    });
  }

  handleChangeKeyring(keyringId) {
    this.setState({keyringId}, () => this.loadKeyring());
  }

  handleDeleteKeyring(keyringId, keyringName) {
    if (confirm(`Do you want to remove the keyring with id: ${keyringName} ?`)) {
      port.send('delete-keyring', {keyringId})
      .then(() => this.loadKeyring());
    }
  }

  handleChangePrimaryKey(keyId) {
    port.send('set-keyring-attr', {keyringId: this.state.keyringId, keyringAttr: {primary_key: keyId}})
    .then(() => this.setState({primaryKeyId: keyId}));
  }

  handleDeleteKey(fingerprint, type) {
    port.send('removeKey', {fingerprint, type, keyringId: this.state.keyringId})
    .then(() => this.loadKeyring());
  }

  initMessageListener() {
    mvelo.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.event) {
        case 'reload-options':
          document.location.reload();
          sendResponse();
          break;
      }
    });
  }

  render() {
    return (
      <div>
        <Route exact path="/" render={() => <Redirect to="/keyring/display" />} />
        <Route exact path="/keyring" render={() => <Redirect to="/keyring/display" />} />
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
            <Route path='/dashboard' component={Dashboard}/>
            <Route path='/keyring' render={() => (
              <div>
                <div className="col-md-3">
                  <KeyringSelect keyringId={this.state.keyringId} keyringAttr={this.state.keyringAttr} onChange={this.handleChangeKeyring} onDelete={this.handleDeleteKeyring}/>
                  <div role="navigation">
                    <ul className="nav nav-pills nav-stacked" role="tablist" aria-label="secondary menu">
                      <NavLink to="/keyring/display">{l10n.map.keyring_display_keys}</NavLink>
                      <NavLink to="/keyring/import">{l10n.map.keyring_import_keys}</NavLink>
                      <NavLink to="/keyring/generate">{l10n.map.keyring_generate_key}</NavLink>
                      <NavLink to="/keyring/setup">{l10n.map.keyring_setup}</NavLink>
                    </ul>
                  </div>
                </div>
                <div className="col-md-9">
                  <div className="jumbotron secureBackground">
                    <section className="well">
                      <ProviderLogo logo={this.state.providerLogo} />
                      <Route path='/keyring/display' render={() =>
                        <KeyGrid keys={this.state.keys}
                          primaryKeyId={this.state.primaryKeyId}
                          onChangePrimaryKey={this.handleChangePrimaryKey}
                          onDeleteKey={this.handleDeleteKey}
                          spinner={this.state.keyGridSpinner} />
                      } />
                      <Route path='/keyring/import' render={({location}) => <ImportKey onKeyringChange={this.loadKeyring} demail={this.state.isDemail} prefs={this.state.prefs} location={location} />} />
                      <Route path='/keyring/generate' render={() => <GenerateKey onKeyringChange={this.loadKeyring} demail={this.state.isDemail} name={this.state.name} email={this.state.email} />} />
                      <Route path='/keyring/setup' render={() => <KeyringSetup hasPrivateKey={this.state.hasPrivateKey} />} />
                    </section>
                    <button className="btn btn-link pull-right secureBgndSettingsBtn lockBtnIcon" title={l10n.map.security_background_button_title} disabled="disabled"></button>
                  </div>
                </div>
              </div>
            )}/>
            <Route path='/encryption' render={() => (
              <div>
                <div className="col-md-3">
                  <div role="navigation">
                    <ul className="nav nav-pills nav-stacked">
                      <NavLink to="/encryption/file-encrypt">{l10n.map.file_encrypting}</NavLink>
                      <NavLink to="/encryption/file-decrypt">{l10n.map.file_decrypting}</NavLink>
                    </ul>
                  </div>
                </div>
                <div className="col-md-9">
                  <div className="jumbotron secureBackground">
                    <section className="well">
                      <Route path='/encryption/file-encrypt' component={EncryptFile} />
                      <Route path='/encryption/file-decrypt' component={EncryptFile} />
                    </section>
                    <button className="btn btn-link pull-right secureBgndSettingsBtn lockBtnIcon" title={l10n.map.security_background_button_title} disabled="disabled"></button>
                  </div>
                </div>
              </div>
            )}/>
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
                    <section className="well">
                      <Route path='/settings/general' component={General} />
                      <Route path='/settings/security' component={Security} />
                      <Route path='/settings/watchlist' component={WatchList} />
                      <Route path='/settings/security-log' component={SecurityLog} />
                      <Route path='/settings/key-server' render={() => <KeyServer prefs={this.state.prefs} onChangePrefs={this.handleChangePrefs} />} />
                    </section>
                    <button className="btn btn-link pull-right secureBgndSettingsBtn lockBtnIcon" title={l10n.map.security_background_button_title} disabled="disabled"></button>
                  </div>
                </div>
              </div>
            )}/>
          </div>
          <footer className="row">
            <p className="pull-left col-md-6">&copy; 2012-2017 Mailvelope GmbH</p>
            <div id="version" className="pull-right col-md-6">{this.state.version}</div>
          </footer>
        </div>
      </div>
    );
  }
}

export function openTab(url) {
  port.emit('open-tab', {url});
}

export function keyring(event, options = {}) {
  options.keyringId = app.state.keyringId;
  return port.send(event, options);
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
