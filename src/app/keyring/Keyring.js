/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import {Route, Redirect, Link} from 'react-router-dom';
import PropTypes from 'prop-types';
import * as l10n from '../../lib/l10n';
import {MAIN_KEYRING_ID, GNUPG_KEYRING_ID} from '../../lib/constants';
import {port} from '../app';
import {KeyringOptions} from './KeyringOptions';
import KeyGrid from './KeyGrid';
import Key from './Key';
import User from './User';
import KeyImport from './KeyImport';
import GenerateKey from './GenerateKey';
import KeyringSetup from './KeyringSetup';
import Spinner from '../../components/util/Spinner';
import KeyringSelect from './components/KeyringSelect';
import Notifications from '../../components/util/Notifications';

l10n.register([
  'keyring_header'
]);

const DEMAIL_SUFFIX = 'de-mail.de';

export default class Keyring extends React.Component {
  constructor(props) {
    super(props);
    // get URL parameter
    const query = new URLSearchParams(document.location.search);
    const keyringId = query.get('krid') || '';
    const name = query.get('fname') || '';
    const email = query.get('email') || '';
    this.state = {
      keyringId,
      name,
      email,
      keyringAttr: undefined, // keyring meta data
      defaultKeyFpr: '', // active keyring: fingerprint of default key
      hasPrivateKey: false, // active keyring: has private key
      demail: false, // active keyring: is keyring from de-mail provider
      gnupg: false, // active keyring: is the GnuPG keyring
      keys: [], // active keyring: keys
      keysLoading: true, // active keyring: waiting for loading of keys
      notifications: []
    };
    this.handleChangeKeyring = this.handleChangeKeyring.bind(this);
    this.handleDeleteKeyring = this.handleDeleteKeyring.bind(this);
    this.handleDeleteKey = this.handleDeleteKey.bind(this);
    this.handleChangeDefaultKey = this.handleChangeDefaultKey.bind(this);
    this.handleRefreshKeyring = this.handleRefreshKeyring.bind(this);
    this.loadKeyring = this.loadKeyring.bind(this);
  }

  async componentDidMount() {
    await this.initActiveKeyring();
    await this.loadKeyring();
  }

  setStateAsync(state) {
    return new Promise(resolve => this.setState(state, resolve));
  }

  async initActiveKeyring() {
    if (this.state.keyringId) {
      return;
    }
    const keyringId = await port.send('get-active-keyring');
    await this.setStateAsync({keyringId: keyringId || MAIN_KEYRING_ID});
  }

  async loadKeyring() {
    /* eslint-disable react/no-access-state-in-setstate */
    const keyringAttr = await port.send('get-all-keyring-attr');
    const keyringId = keyringAttr[this.state.keyringId] ? this.state.keyringId : MAIN_KEYRING_ID;
    const defaultKeyFpr = keyringAttr[keyringId].default_key || '';
    const demail = keyringId.includes(DEMAIL_SUFFIX);
    const gnupg = keyringId === GNUPG_KEYRING_ID;
    // propagate state change to backend
    port.emit('set-active-keyring', {keyringId});
    let keys = await port.send('getKeys', {keyringId});
    keys = keys.sort((a, b) => a.name.localeCompare(b.name));
    const hasPrivateKey = keys.some(key => key.type === 'private');
    /* eslint-enable react/no-access-state-in-setstate */
    this.setState({
      keyringId, defaultKeyFpr, demail, gnupg, keyringAttr, hasPrivateKey, keys, keysLoading: false
    });
  }

  async handleChangeKeyring(keyringId) {
    await this.setStateAsync({keyringId, keysLoading: true});
    await this.loadKeyring();
  }

  async handleDeleteKeyring(keyringId) {
    await port.send('delete-keyring', {keyringId});
    await this.loadKeyring();
  }

  async handleChangeDefaultKey(keyFpr) {
    await port.send('set-keyring-attr', {keyringId: this.state.keyringId, keyringAttr: {default_key: keyFpr}});
    this.setState({defaultKeyFpr: keyFpr});
  }

  async handleDeleteKey(fingerprint, type) {
    await port.send('removeKey', {fingerprint, type, keyringId: this.state.keyringId});
    this.loadKeyring();
  }

  async handleRefreshKeyring() {
    if (this.state.gnupg) {
      this.setState({keysLoading: true});
      await port.send('reload-keystore', {keyringId: this.state.keyringId});
    }
    this.loadKeyring();
  }

  render() {
    return (
      <>
        <KeyringOptions.Provider value={{keyringId: this.state.keyringId, demail: this.state.demail, gnupg: this.state.gnupg}}>
          <div className="jumbotron">
            <section className="card">
              {!this.state.keyringId || this.state.keysLoading ? (
                <Spinner delay={0} />
              ) : (
                <>
                  <Route exact path="/keyring" render={() => this.state.keys.length ? <Redirect to="/keyring/display" /> : <Redirect to="/keyring/setup" />} />
                  <Route exact path="/keyring/key/:keyFpr" render={props => <Key {...props} keyData={this.state.keys.find(key => key.fingerprint === props.match.params.keyFpr)} defaultKeyFpr={this.state.defaultKeyFpr} onChangeDefaultKey={this.handleChangeDefaultKey} onDeleteKey={this.handleDeleteKey} onKeyringChange={this.loadKeyring} />} />
                  <Route exact path="/keyring/key/:keyFpr/user/:userIdx" render={props => <User {...props} keyData={this.state.keys.find(key => key.fingerprint === props.match.params.keyFpr)} onKeyringChange={this.loadKeyring} />} />
                  <Route path="/keyring/display/:keyId?" render={props => (<KeyGrid keys={this.state.keys} {...props} keyringAttr={this.state.keyringAttr} onChangeKeyring={this.handleChangeKeyring} onDeleteKeyring={this.handleDeleteKeyring} prefs={this.props.prefs} defaultKeyFpr={this.state.defaultKeyFpr} onChangeDefaultKey={this.handleChangeDefaultKey} onDeleteKey={this.handleDeleteKey} onRefreshKeyring={this.handleRefreshKeyring} spinner={this.state.keysLoading} />)} />
                  <Route path="/keyring/import" render={({location}) => (
                    <div className="card-body">
                      <nav aria-label="breadcrumb">
                        <ol className="breadcrumb bg-transparent p-0">
                          <li className="breadcrumb-item"><Link to="/keyring" replace tabIndex="0"><span className="icon icon-arrow-left" aria-hidden="true"></span> {l10n.map.keyring_header}</Link></li>
                        </ol>
                      </nav>
                      <div className="card-title d-flex flex-wrap align-items-center">
                        <h1 className="flex-shrink-0 mr-auto">{l10n.map.keyring_import_keys}</h1>
                      </div>
                      <KeyImport onKeyringChange={this.loadKeyring} onNotification={notification => this.setState({notifications: [notification]})} location={location} />
                    </div>
                  )} />
                  <Route path="/keyring/generate" render={() => (
                    <div className="card-body">
                      <nav aria-label="breadcrumb">
                        <ol className="breadcrumb bg-transparent p-0">
                          <li className="breadcrumb-item"><Link to="/keyring" replace tabIndex="0"><span className="icon icon-arrow-left" aria-hidden="true"></span> {l10n.map.keyring_header}</Link></li>
                        </ol>
                      </nav>
                      <div className="card-title d-flex flex-wrap align-items-center">
                        <h1 className="flex-shrink-0 mr-auto">{l10n.map.keyring_generate_key}</h1>
                      </div>
                      <GenerateKey onKeyringChange={this.loadKeyring} onNotification={notification => this.setState({notifications: [notification]})} defaultName={this.state.name} defaultEmail={this.state.email} />
                    </div>
                  )} />
                  <Route path="/keyring/setup" render={() => (
                    <div className="card-body">
                      <div className="card-title d-flex flex-wrap align-items-center">
                        <h1 className="flex-shrink-0 mr-auto">{l10n.map.keyring_setup}</h1>
                        <div className="flex-shrink-0">
                          <KeyringSelect keyringId={this.context.keyringId} keyringAttr={this.state.keyringAttr} onChange={this.handleChangeKeyring} prefs={this.props.prefs} />
                        </div>
                      </div>

                      {/* Info Banner */}
                      {!this.state.hasPrivateKey && (
                        <div className="alert alert-info w-100 mb-4">
                          <strong>{l10n.map.keyring_setup_no_keypair_heading}</strong><br />
                          <span>{l10n.map.keyring_setup_no_keypair}</span>
                        </div>
                      )}

                      <KeyringSetup isOnboarding={false} />
                    </div>
                  )} />
                </>
              )}
            </section>
          </div>
          <Notifications items={this.state.notifications} hideDelay={5000} />
        </KeyringOptions.Provider>
      </>
    );
  }
}

Keyring.propTypes = {
  prefs: PropTypes.object,
  location: PropTypes.object
};

