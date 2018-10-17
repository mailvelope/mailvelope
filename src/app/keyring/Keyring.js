/**
 * Copyright (C) 2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import mvelo from '../../mvelo';
import React from 'react';
import {Route, Redirect} from 'react-router-dom';
import PropTypes from 'prop-types';
import * as l10n from '../../lib/l10n';
import {port} from '../app';

import KeyringSelect from './components/KeyringSelect';
import KeyGrid from './KeyGrid';
import ImportKey from './importKey';
import GenerateKey from './GenerateKey';
import KeyringSetup from './KeyringSetup';
import Spinner from '../../components/util/Spinner';

l10n.register([
  'keyring_header',
  'security_background_button_title'
]);

const DEMAIL_SUFFIX = 'de-mail.de';

export const KeyringOptions = React.createContext({demail: false, gnupg: false});

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
      keysLoading: true // active keyring: waiting for loading of keys
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
    this.loadKeyring();
  }

  initActiveKeyring() {
    return new Promise(resolve => {
      if (this.state.keyringId) {
        return resolve();
      }
      port.send('get-active-keyring')
      .then(keyringId => this.setState({keyringId: keyringId || mvelo.MAIN_KEYRING_ID}, resolve));
    });
  }

  loadKeyring() {
    port.send('get-all-keyring-attr')
    .then(keyringAttr => {
      this.setState(prevState => {
        const keyringId = keyringAttr[prevState.keyringId] ? prevState.keyringId : mvelo.MAIN_KEYRING_ID;
        const defaultKeyFpr = keyringAttr[keyringId].default_key || '';
        const demail = keyringId.includes(DEMAIL_SUFFIX);
        const gnupg = keyringId === mvelo.GNUPG_KEYRING_ID;
        // propagate state change to backend
        port.emit('set-active-keyring', {keyringId});
        return {keyringId, defaultKeyFpr, demail, gnupg, keyringAttr, keysLoading: true};
      }, () => {
        port.send('getKeys', {keyringId: this.state.keyringId})
        .then(keys => {
          keys = keys.sort((a, b) => a.name.localeCompare(b.name));
          const hasPrivateKey = keys.some(key => key.type === 'private');
          this.setState({hasPrivateKey, keys, keysLoading: false});
        });
      });
    });
  }

  handleChangeKeyring(keyringId) {
    this.setState({keyringId, keysLoading: true}, () => this.loadKeyring());
  }

  handleDeleteKeyring(keyringId, keyringName) {
    if (confirm(mvelo.l10n.getMessage('keyring_confirm_deletion', keyringName))) {
      port.send('delete-keyring', {keyringId})
      .then(() => this.loadKeyring());
    }
  }

  handleChangeDefaultKey(keyFpr) {
    port.send('set-keyring-attr', {keyringId: this.state.keyringId, keyringAttr: {default_key: keyFpr}})
    .then(() => this.setState({defaultKeyFpr: keyFpr}));
  }

  handleDeleteKey(fingerprint, type) {
    port.send('removeKey', {fingerprint, type, keyringId: this.state.keyringId})
    .then(() => this.loadKeyring());
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
          <div className="col-md-12">
            <KeyringSelect keyringId={this.state.keyringId} keyringAttr={this.state.keyringAttr} onChange={this.handleChangeKeyring} onDelete={this.handleDeleteKeyring} prefs={this.props.prefs} />
            <h3 className="section-header">
              <span>{l10n.map.keyring_header}</span>
            </h3>
            <div className="jumbotron secureBackground">
              <section className="well">
                {!this.state.keyringId || this.state.keysLoading ? (
                  <Spinner delay={0} />
                ) : (
                  <>
                    <Route exact path="/keyring" render={() => this.state.keys.length ? <Redirect to='/keyring/display' /> : <Redirect to='/keyring/setup' />} />
                    <Route path='/keyring/display' render={() => <KeyGrid keys={this.state.keys} defaultKeyFpr={this.state.defaultKeyFpr} onChangeDefaultKey={this.handleChangeDefaultKey} onDeleteKey={this.handleDeleteKey} onRefreshKeyring={this.handleRefreshKeyring} spinner={this.state.keysLoading} />} />
                    <Route path='/keyring/import' render={({location}) => <ImportKey onKeyringChange={this.loadKeyring} prefs={this.props.prefs} location={location} />} />
                    <Route path='/keyring/generate' render={() => <GenerateKey onKeyringChange={this.loadKeyring} defaultName={this.state.name} defaultEmail={this.state.email} />} />
                    <Route path='/keyring/setup' render={() => <KeyringSetup hasPrivateKey={this.state.hasPrivateKey} />} />
                  </>
                )}
              </section>
              <button type="button" className="btn btn-link pull-right secureBgndSettingsBtn lockBtnIcon" title={l10n.map.security_background_button_title} disabled="disabled"></button>
            </div>
          </div>
        </KeyringOptions.Provider>
      </>
    );
  }
}

Keyring.propTypes = {
  prefs: PropTypes.object
};
