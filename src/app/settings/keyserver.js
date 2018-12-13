/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

/**
 * @fileOverview Implements the key server configuration ui in the
 * settings dialog
 */

import * as l10n from '../../lib/l10n';
import Alert from '../../components/util/Alert';
import {port} from '../app';

import React from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import 'react-select/dist/react-select.css';

l10n.register([
  'alert_header_warning',
  'alert_header_error',
  'form_cancel',
  'form_save',
  'keyserver_hkp_url',
  'keyserver_url_warning',
  'keyserver_url_error',
  'keyserver_additionals_label',
  'keyserver_tofu_lookup',
  'keyserver_wkd_lookup',
  'keyserver_autocrypt_lookup',
  'learn_more_link',
  'settings_keyserver'
]);

function initialState({prefs}) {
  let hkp_base_url = '';
  let hkp_server_list = [];
  let mvelo_tofu_lookup = false;
  let wkd_lookup = false;
  let autocrypt_lookup = false;
  if (prefs) {
    hkp_base_url = prefs.keyserver.hkp_base_url;
    hkp_server_list = prefs.keyserver.hkp_server_list.map(server => ({value: server, label: server}));
    if (!prefs.keyserver.hkp_server_list.includes(hkp_base_url)) {
      hkp_server_list.push({value: hkp_base_url, label: hkp_base_url});
    }
    mvelo_tofu_lookup = prefs.keyserver.mvelo_tofu_lookup;
    wkd_lookup = prefs.keyserver.wkd_lookup;
    autocrypt_lookup = prefs.keyserver.autocrypt_lookup;
  }
  return {
    hkp_base_url,
    valid_base_url: true,
    hkp_server_list,
    mvelo_tofu_lookup,
    wkd_lookup,
    autocrypt_lookup,
    alert: null,
    modified: false,
    previousPrefs: prefs
  };
}

export default class KeyServer extends React.Component {
  constructor(props) {
    super(props);
    this.state = initialState(props);
    this.handleCheck = this.handleCheck.bind(this);
    this.handleServerChange = this.handleServerChange.bind(this);
  }

  static getDerivedStateFromProps(props, state) {
    // reset state if prefs change
    if (props.prefs !== state.previousPrefs) {
      return initialState(props);
    }
    return null;
  }

  handleServerChange(server) {
    const hkp_base_url = server && server.value || '';
    const valid_base_url = this.validateUrl(hkp_base_url);
    const alert = valid_base_url ? null : {header: l10n.map.alert_header_warning, message: l10n.map.keyserver_url_warning, type: 'warning'};
    this.setState({hkp_base_url, modified: true, valid_base_url, alert});
  }

  /**
   * Validates a HKP url using a regex.
   * @param  {String} url   The base url of the hkp server
   * @return {Boolean}      If the url is valid
   */
  validateUrl(url) {
    const urlPattern = /^(http|https):\/\/(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])(:\d{2,5})?$/;
    return urlPattern.test(url);
  }

  /**
   * Validates a HKP url by query the key server using a well known public key ID.
   * @param  {String} url   The base url of the hkp server
   * @return {Promise}      If the test was valid. Rejects in case of an error.
   */
  testUrl(url) {
    return window.fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('Server not reachable');
      }
    });
  }

  handleCheck(event) {
    const target = event.target;
    this.setState({[target.name]: target.checked, modified: true});
  }

  /**
   * Save the key server settings.
   */
  handleSave() {
    this.testUrl(this.state.hkp_base_url)
    .then(() => {
      const update = {
        keyserver: {
          hkp_base_url: this.state.hkp_base_url,
          hkp_server_list: this.state.hkp_server_list.map(server => server.value),
          mvelo_tofu_lookup: this.state.mvelo_tofu_lookup,
          wkd_lookup: this.state.wkd_lookup,
          autocrypt_lookup: this.state.autocrypt_lookup
        }
      };
      this.props.onChangePrefs(update)
      .then(() => port.emit('init-script-injection'));
    })
    .catch(() => this.setState({alert: {header: l10n.map.alert_header_error, message: l10n.map.keyserver_url_error, type: 'danger'}}));
  }

  render() {
    return (
      <div>
        <h3>{l10n.map.settings_keyserver}</h3>
        <form className="form">
          <h4 className="control-label">{l10n.map.keyserver_hkp_url}</h4>
          <div className="form-group">
            <Select.Creatable value={this.state.hkp_base_url} options={this.state.hkp_server_list}
              onChange={this.handleServerChange}
              isValidNewOption={option => this.validateUrl(option && option.label)}
            />
          </div>
          <h4 className="control-label">{l10n.map.keyserver_additionals_label}</h4>
          <div className="form-group">
            <div className="checkbox">
              <label className="checkbox" htmlFor="keyserverTOFULookup">
                <input type="checkbox" name="mvelo_tofu_lookup" checked={this.state.mvelo_tofu_lookup} onChange={this.handleCheck} id="keyserverTOFULookup" />
                <span>{l10n.map.keyserver_tofu_lookup}</span>. <a href="https://keys.mailvelope.com" target="_blank" rel="noopener noreferrer">{l10n.map.learn_more_link}</a>
              </label>
            </div>
            <div className="checkbox">
              <label className="checkbox" htmlFor="keyserverWKDLookup">
                <input type="checkbox" name="wkd_lookup" checked={this.state.wkd_lookup} onChange={this.handleCheck} id="keyserverWKDLookup" />
                <span>{l10n.map.keyserver_wkd_lookup}</span>. <a href="https://wiki.gnupg.org/WKD" target="_blank" rel="noopener noreferrer">{l10n.map.learn_more_link}</a>
              </label>
            </div>
            <div className="checkbox">
              <label className="checkbox" htmlFor="autocryptLookup">
                <input type="checkbox" name="autocrypt_lookup" checked={this.state.autocrypt_lookup} onChange={this.handleCheck} id="autocryptLookup" />
                <span>{l10n.map.keyserver_autocrypt_lookup}</span>. <a href="https://autocrypt.org" target="_blank" rel="noopener noreferrer">{l10n.map.learn_more_link}</a>
              </label>
            </div>
          </div>
          <div className="form-group">
            {this.state.alert && <Alert header={this.state.alert.header} type={this.state.alert.type}>{this.state.alert.message}</Alert>}
          </div>
          <div className="form-group">
            <button type="button" onClick={() => this.handleSave()} className="btn btn-primary" disabled={!(this.state.modified && this.state.valid_base_url)}>{l10n.map.form_save}</button>
            <button type="button" onClick={() => this.setState(initialState(this.props))} className="btn btn-default" disabled={!this.state.modified}>{l10n.map.form_cancel}</button>
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
