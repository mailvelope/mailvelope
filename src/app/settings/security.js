/**
 * Copyright (C) 2012-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {port} from '../app';
import {str2bool} from '../../lib/util';
import * as l10n from '../../lib/l10n';

l10n.register([
  'form_cancel',
  'form_save',
  'reload_tab',
  'security_cache_header',
  'security_cache_help',
  'security_cache_off',
  'security_cache_on',
  'security_cache_time',
  'security_display_decrypted',
  'security_display_inline',
  'security_display_popup',
  'security_hide_armored_head',
  'security_openpgp_header',
  'settings_security',
]);

export default class Security extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      display_decrypted: 'inline',
      password_cache: true,
      password_timeout: 30,
      hide_armored_header: false,
      modified: false,
      errors: {}
    };
    this.handleChange = this.handleChange.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
  }

  componentDidMount() {
    this.loadPrefs();
  }

  async loadPrefs() {
    const {security} = await port.send('get-prefs');
    this.setState({
      display_decrypted: security.display_decrypted,
      password_cache: security.password_cache,
      password_timeout: security.password_timeout,
      hide_armored_header: security.hide_armored_header
    });
  }

  handleChange(event) {
    const target = event.target;
    this.setState(({errors: err}) => {
      const {[target.name]: deleted, ...errors} = err;
      return {
        [target.name]: target.type === 'checkbox' ? target.checked : str2bool(target.value),
        modified: true,
        errors
      };
    });
  }

  async handleSave() {
    if (this.validate()) {
      const update = {
        security: {
          display_decrypted: this.state.display_decrypted,
          password_cache: this.state.password_cache,
          password_timeout: this.state.password_timeout,
          hide_armored_header: this.state.hide_armored_header
        }
      };
      await port.send('set-prefs', {prefs: update});
      this.setState({modified: false}, () => this.props.onSetNotification({message: l10n.map.reload_tab}));
    }
  }

  validate() {
    // password timeout betweet 1-999
    const timeout = parseInt(this.state.password_timeout);
    if (isNaN(timeout) || (timeout < 1 || timeout > 999)) {
      this.setState({errors: {password_timeout: new Error()}});
      return false;
    }
    return true;
  }

  handleCancel() {
    this.loadPrefs();
  }

  render() {
    return (
      <div id="security">
        <h2 className="mb-4">{l10n.map.settings_security}</h2>
        <form className="form">
          <div className="form-group mb-4">
            <h3>{l10n.map.security_cache_header}</h3>
            <div className="form-inline">
              <div className="custom-control custom-radio custom-control-inline mr-2">
                <input type="radio" name="password_cache" id="pwdCacheRadios1" value="true" checked={this.state.password_cache} onChange={this.handleChange} className="custom-control-input" />
                <label className="custom-control-label" htmlFor="pwdCacheRadios1">{l10n.map.security_cache_on}</label>
              </div>
              <input type="text" maxLength="3" id="pwdCacheTime" name="password_timeout" value={this.state.password_timeout} style={{width: '50px'}} onChange={this.handleChange} className={`form-control mr-2 text-right ${this.state.errors.password_timeout ? 'is-invalid' : ''}`} />
              <label className="my-1 mr-2" htmlFor="pwdCacheTime">{l10n.map.security_cache_time}</label>
              {this.state.errors.password_timeout && <div className="invalid-feedback mb-2">{l10n.map.security_cache_help}</div>}
            </div>
            <div className="custom-control custom-radio custom-control-inline mr-2">
              <input type="radio" name="password_cache" id="pwdCacheRadios2" value="false" checked={!this.state.password_cache} onChange={this.handleChange} className="custom-control-input" />
              <label className="custom-control-label" htmlFor="pwdCacheRadios2">{l10n.map.security_cache_off}</label>
            </div>
          </div>
          <div className="form-group mb-4">
            <h3>{l10n.map.security_display_decrypted}</h3>
            <div className="custom-control custom-radio">
              <input type="radio" name="display_decrypted" id="decryptRadios2" value="popup" checked={this.state.display_decrypted === 'popup'} onChange={this.handleChange} className="custom-control-input" />
              <label className="custom-control-label" htmlFor="decryptRadios2">{l10n.map.security_display_popup}</label>
            </div>
            <div className="custom-control custom-radio">
              <input type="radio" name="display_decrypted" id="decryptRadios1" value="inline" checked={this.state.display_decrypted === 'inline'} onChange={this.handleChange} className="custom-control-input" />
              <label className="custom-control-label" htmlFor="decryptRadios1">{l10n.map.security_display_inline}</label>
            </div>
          </div>
          <div className="form-group mb-4">
            <h3>{l10n.map.security_openpgp_header}</h3>
            <div className="custom-control custom-checkbox">
              <input className="custom-control-input" type="checkbox" checked={this.state.hide_armored_header} onChange={this.handleChange} id="hideArmoredHeader" name="hide_armored_header" />
              <label className="custom-control-label" htmlFor="hideArmoredHeader">{l10n.map.security_hide_armored_head}</label>
            </div>
          </div>
          <div className="btn-bar">
            <button type="button" id="secBtnSave" className="btn btn-primary" onClick={this.handleSave} disabled={!this.state.modified}>{l10n.map.form_save}</button>
            <button type="button" className="btn btn-secondary" onClick={this.handleCancel} disabled={!this.state.modified}>{l10n.map.form_cancel}</button>
          </div>
        </form>
      </div>
    );
  }
}

Security.propTypes = {
  onSetNotification: PropTypes.func,
};
