/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
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
        <h3>{l10n.map.settings_general}</h3>
        <form>
          <div className="form-group">
            <h4 className="control-label">{l10n.map.keygrid_default_key}</h4>
            <div className="checkbox">
              <label>
                <input type="checkbox" name="auto_add_primary" checked={this.state.auto_add_primary} onChange={this.handleCheck} />
                <span>{l10n.map.general_default_key_always}</span>
              </label>
            </div>
            <div className="checkbox">
              <label>
                <input type="checkbox" name="auto_sign_msg" checked={this.state.auto_sign_msg} onChange={this.handleCheck} />
                <span>{l10n.map.general_default_key_auto_sign}</span>
              </label>
            </div>
          </div>
          <AppOptions.Consumer>
            {({gnupg}) => (
              <div className="form-group">
                <h4 className="control-label">{l10n.map.general_openpgp_preferences}</h4>
                <div style={{marginBottom: '10px'}}>{l10n.map.general_openpgp_current} <b>{gnupg && this.state.prefer_gnupg ? 'GnuPG' : 'OpenPGP.js'}</b></div>
                {this.state.nativeMessaging ? (
                  gnupg ? (
                    <div>
                      <span style={{marginRight: '10px'}}>{l10n.map.general_openpgp_prefer}</span>
                      <div className="btn-group btn-group-sm" role="group">
                        <button type="button" onClick={() => this.handlePreferGnuPG(false)} className={`btn btn-${this.state.prefer_gnupg ? 'default' : 'primary'}`}>OpenPGP.js</button>
                        <button type="button" onClick={() => this.handlePreferGnuPG(true)} className={`btn btn-${!this.state.prefer_gnupg ? 'default' : 'primary'}`}>GnuPG</button>
                      </div>
                      <span className="help-block">{l10n.map.general_prefer_gnupg_note}</span>
                    </div>
                  ) : (
                    <div>
                      <div className="alert alert-info" role="alert">
                        <div><strong>{l10n.map.general_gnupg_not_available}</strong></div>
                        <div>
                          <Trans id={l10n.map.general_gnupg_installed_question} components={[
                            <a key="0" style={{margin: '0 5px'}} href="https://www.gnupg.org/download/index.html" target="_blank" rel="noopener noreferrer" className="btn btn-default btn-sm" role="button"></a>,
                            <button key="1" style={{margin: '0 5px'}} type="button" onClick={() => chrome.runtime.reload()} className="btn btn-default btn-sm"></button>
                          ]} />
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div>
                    <span style={{marginRight: '10px'}}>{l10n.map.general_gnupg_prefer}</span>
                    <button type="button" onClick={() => this.requestNativeMessagingPermission()} className="btn btn-default btn-sm">{l10n.map.general_gnupg_check_availability}</button>
                  </div>
                )}
              </div>
            )}
          </AppOptions.Consumer>
          <div className="form-group">
            <button type="button" onClick={this.handleSave} className="btn btn-primary" disabled={!this.state.modified}>{l10n.map.form_save}</button>
            <button type="button" onClick={this.handleCancel} className="btn btn-default" disabled={!this.state.modified}>{l10n.map.form_cancel}</button>
          </div>
        </form>
      </div>
    );
  }
}
