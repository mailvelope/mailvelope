/**
 * Copyright (C) 2012-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import {port, AppOptions} from '../app';
import * as l10n from '../../lib/l10n';
import Trans from '../../components/util/Trans';

l10n.register([
  'form_cancel',
  'form_save',
  'general_default_key_always',
  'general_default_key_auto_sign',
  'general_gnupg_check_availability',
  'general_gnupg_installed_question',
  'general_gnupg_not_available',
  'general_gnupg_prefer',
  'general_openpgp_current',
  'general_openpgp_prefer',
  'general_openpgp_preferences',
  'general_prefer_gnupg_note',
  'keygrid_default_key',
  'settings_general'
]);

export default class General extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      auto_add_primary: false,
      auto_sign_msg: false,
      prefer_gnupg: false,
      modified: false,
      nativeMessaging: true
    };
    this.handleCheck = this.handleCheck.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
  }

  componentDidMount() {
    this.loadPrefs();
    chrome.permissions.contains({permissions: ['nativeMessaging']}, nativeMessaging => this.setState({nativeMessaging}));
  }

  async loadPrefs() {
    const {general} = await port.send('get-prefs');
    this.setState({
      auto_add_primary: general.auto_add_primary,
      auto_sign_msg: general.auto_sign_msg,
      prefer_gnupg: general.prefer_gnupg,
      modified: false
    });
  }

  handleCheck({target}) {
    this.setState({[target.name]: target.checked, modified: true});
  }

  async handleSave() {
    const update = {
      general: {
        auto_add_primary: this.state.auto_add_primary,
        auto_sign_msg: this.state.auto_sign_msg,
        prefer_gnupg: this.state.prefer_gnupg
      }
    };
    await port.send('set-prefs', {prefs: update});
    this.setState({modified: false});
  }

  handleCancel() {
    this.loadPrefs();
  }

  handlePreferGnuPG(prefer_gnupg) {
    this.setState(prevState => ({prefer_gnupg, modified: prevState.modified || prevState.prefer_gnupg !== prefer_gnupg}));
  }

  requestNativeMessagingPermission() {
    chrome.permissions.request({permissions: ['nativeMessaging']}, nativeMessaging => this.setState({nativeMessaging}));
  }

  render() {
    return (
      <div id="general">
        <h2 className="mb-4">{l10n.map.settings_general}</h2>
        <form>
          <div className="form-group">
            <h3>{l10n.map.keygrid_default_key}</h3>
            <div className="custom-control custom-checkbox">
              <input className="custom-control-input" type="checkbox" id="auto_add_primary" name="auto_add_primary" checked={this.state.auto_add_primary} onChange={this.handleCheck} />
              <label className="custom-control-label" htmlFor="auto_add_primary"><span>{l10n.map.general_default_key_always}</span></label>
            </div>
            <div className="custom-control custom-checkbox">
              <input className="custom-control-input" type="checkbox" id="auto_sign_msg" name="auto_sign_msg" checked={this.state.auto_sign_msg} onChange={this.handleCheck} />
              <label className="custom-control-label" htmlFor="auto_sign_msg"><span>{l10n.map.general_default_key_auto_sign}</span></label>
            </div>
          </div>
          <AppOptions.Consumer>
            {({gnupg}) => (
              <div className="form-group">
                <h3>{l10n.map.general_openpgp_preferences}</h3>
                <p>{l10n.map.general_openpgp_current} <b>{gnupg && this.state.prefer_gnupg ? 'GnuPG' : 'OpenPGP.js'}</b></p>
                {this.state.nativeMessaging ? (
                  gnupg ? (
                    <>
                      <div className="d-flex align-items-center">
                        <span className="mr-3">{l10n.map.general_openpgp_prefer}</span>
                        <div className="btn-group btn-group-sm" role="group">
                          <button type="button" onClick={() => this.handlePreferGnuPG(false)} className={`btn btn-${this.state.prefer_gnupg ? 'secondary' : 'primary'}`}>OpenPGP.js</button>
                          <button type="button" onClick={() => this.handlePreferGnuPG(true)} className={`btn btn-${!this.state.prefer_gnupg ? 'secondary' : 'primary'}`}>GnuPG</button>
                        </div>
                      </div>
                      <small className="form-text text-muted">
                        {l10n.map.general_prefer_gnupg_note}
                      </small>
                    </>
                  ) : (
                    <div>
                      <div className="alert alert-info" role="alert">
                        <div><strong>{l10n.map.general_gnupg_not_available}</strong></div>
                        <div>
                          <Trans id={l10n.map.general_gnupg_installed_question} components={[
                            <a key="0" href="https://www.gnupg.org/download/index.html" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm my-1" role="button"></a>,
                            <button key="1" type="button" onClick={() => chrome.runtime.reload()} className="btn btn-secondary btn-sm"></button>
                          ]} />
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div>
                    <span className="mr-2">{l10n.map.general_gnupg_prefer}</span>
                    <button type="button" onClick={() => this.requestNativeMessagingPermission()} className="btn btn-secondary btn-sm">{l10n.map.general_gnupg_check_availability}</button>
                  </div>
                )}
              </div>
            )}
          </AppOptions.Consumer>
          <div className="btn-bar">
            <button type="button" onClick={this.handleSave} className="btn btn-primary" disabled={!this.state.modified}>{l10n.map.form_save}</button>
            <button type="button" onClick={this.handleCancel} className="btn btn-secondary" disabled={!this.state.modified}>{l10n.map.form_cancel}</button>
          </div>
        </form>
      </div>
    );
  }
}
