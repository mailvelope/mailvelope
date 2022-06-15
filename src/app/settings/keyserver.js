/**
 * Copyright (C) 2016-2021 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

/**
 * @fileOverview Implements the key server configuration ui in the
 * settings dialog
 */

import * as l10n from '../../lib/l10n';
import Trans from '../../components/util/Trans';

import React from 'react';
import PropTypes from 'prop-types';

l10n.register([
  'alert_header_warning',
  'alert_header_error',
  'form_cancel',
  'form_save',
  'keyserver_additionals_label',
  'keyserver_autocrypt_lookup',
  'keyserver_key_binding_header',
  'keyserver_key_binding_label',
  'keyserver_oks_lookup',
  'keyserver_tofu_lookup',
  'keyserver_verifying_servers',
  'keyserver_wkd_lookup',
  'learn_more_link',
  'settings_keyserver'
]);

function initialState({prefs}) {
  let autocrypt_lookup = false;
  let key_binding = false;
  let mvelo_tofu_lookup = false;
  let oks_lookup = false;
  let wkd_lookup = false;
  if (prefs) {
    autocrypt_lookup = prefs.keyserver.autocrypt_lookup;
    key_binding = prefs.keyserver.key_binding;
    mvelo_tofu_lookup = prefs.keyserver.mvelo_tofu_lookup;
    oks_lookup = prefs.keyserver.oks_lookup;
    wkd_lookup = prefs.keyserver.wkd_lookup;
  }
  return {
    autocrypt_lookup,
    key_binding,
    modified: false,
    mvelo_tofu_lookup,
    oks_lookup,
    previousPrefs: prefs,
    wkd_lookup
  };
}

export default class KeyServer extends React.Component {
  constructor(props) {
    super(props);
    this.state = initialState(props);
    this.handleCheck = this.handleCheck.bind(this);
  }

  static getDerivedStateFromProps(props, state) {
    // reset state if prefs change
    if (props.prefs !== state.previousPrefs) {
      return initialState(props);
    }
    return null;
  }

  handleCheck(event) {
    const target = event.target;
    this.setState({[target.name]: target.checked, modified: true});
  }

  /**
   * Save the key server settings.
   */
  async handleSave() {
    const update = {
      keyserver: {
        autocrypt_lookup: this.state.autocrypt_lookup,
        key_binding: this.state.key_binding,
        mvelo_tofu_lookup: this.state.mvelo_tofu_lookup,
        oks_lookup: this.state.oks_lookup,
        wkd_lookup: this.state.wkd_lookup
      }
    };
    await this.props.onChangePrefs(update);
  }

  render() {
    return (
      <div id="keyserver">
        <h2 className="mb-4">{l10n.map.settings_keyserver}</h2>
        <form className="form mb-4">
          <h3>{l10n.map.keyserver_verifying_servers}</h3>
          <div className="form-group">
            <div className="custom-control custom-checkbox">
              <input className="custom-control-input" type="checkbox" id="keyserverTOFULookup" name="mvelo_tofu_lookup" checked={this.state.mvelo_tofu_lookup} onChange={this.handleCheck} />
              <label className="custom-control-label" htmlFor="keyserverTOFULookup"><span>{l10n.map.keyserver_tofu_lookup}</span>. <a href="https://www.mailvelope.com/faq#key_server" target="_blank" rel="noopener noreferrer">{l10n.map.learn_more_link}</a></label>
            </div>
            <div className="custom-control custom-checkbox">
              <input className="custom-control-input" type="checkbox" id="oksLookup" name="oks_lookup" checked={this.state.oks_lookup} onChange={this.handleCheck} />
              <label className="custom-control-label" htmlFor="oksLookup">
                <span>
                  <Trans id={l10n.map.keyserver_oks_lookup} components={[
                    <a key="0" href="https://keys.openpgp.org" target="_blank" rel="noopener noreferrer"></a>
                  ]} />
                </span>.
              </label>
            </div>
          </div>
          <h3>{l10n.map.keyserver_additionals_label}</h3>
          <div className="form-group">
            <div className="custom-control custom-checkbox">
              <input className="custom-control-input" type="checkbox" id="keyserverWKDLookup" name="wkd_lookup" checked={this.state.wkd_lookup} onChange={this.handleCheck} />
              <label className="custom-control-label" htmlFor="keyserverWKDLookup"><span>{l10n.map.keyserver_wkd_lookup}</span>. <a href="https://www.mailvelope.com/faq#web_key_directory" target="_blank" rel="noopener noreferrer">{l10n.map.learn_more_link}</a></label>
            </div>
            <div className="custom-control custom-checkbox">
              <input className="custom-control-input" type="checkbox" id="keyserverAutocryptLookup" name="autocrypt_lookup" checked={this.state.autocrypt_lookup} onChange={this.handleCheck} />
              <label className="custom-control-label" htmlFor="keyserverAutocryptLookup"><span>{l10n.map.keyserver_autocrypt_lookup}</span>. <a href="https://www.mailvelope.com/faq#autocrypt" target="_blank" rel="noopener noreferrer">{l10n.map.learn_more_link}</a></label>
            </div>
          </div>
          <h3>{l10n.map.keyserver_key_binding_header}</h3>
          <div className="form-group">
            <div className="custom-control custom-checkbox">
              <input className="custom-control-input" type="checkbox" id="keyserverKeyBinding" name="key_binding" checked={this.state.key_binding} onChange={this.handleCheck} />
              <label className="custom-control-label" htmlFor="keyserverKeyBinding"><span>{l10n.map.keyserver_key_binding_label}</span>. <a href="https://www.mailvelope.com/faq#key_binding" target="_blank" rel="noopener noreferrer">{l10n.map.learn_more_link}</a></label>
            </div>
          </div>
          <div className="btn-bar">
            <button type="button" onClick={() => this.handleSave()} className="btn btn-primary" disabled={!this.state.modified}>{l10n.map.form_save}</button>
            <button type="button" onClick={() => this.setState(initialState(this.props))} className="btn btn-secondary" disabled={!this.state.modified}>{l10n.map.form_cancel}</button>
          </div>
        </form>
      </div>
    );
  }
}

KeyServer.propTypes = {
  prefs: PropTypes.object,
  onChangePrefs: PropTypes.func.isRequired
};
