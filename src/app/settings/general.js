/**
 * Copyright (C) 2012-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import {port} from '../app';
import * as l10n from '../../lib/l10n';

l10n.register([
  'settings_general',
  'keygrid_primary_key',
  'general_primary_key_always',
  'general_primary_key_auto_sign',
  'general_prefer_gnupg',
  'form_save',
  'form_cancel'
]);

export default class General extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      auto_add_primary: false,
      auto_sign_msg: false,
      prefer_gnupg: false,
      modified: false
    };
    this.handleCheck = this.handleCheck.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
  }

  componentDidMount() {
    this.loadPrefs();
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

  render() {
    return (
      <div id="general">
        <h3>{l10n.map.settings_general}</h3>
        <form>
          <div className="form-group">
            <h4 className="control-label">{l10n.map.keygrid_primary_key}</h4>
            <div className="checkbox">
              <label>
                <input type="checkbox" name="auto_add_primary" checked={this.state.auto_add_primary} onChange={this.handleCheck} />
                <span>{l10n.map.general_primary_key_always}</span>
              </label>
            </div>
            <div className="checkbox">
              <label>
                <input type="checkbox" name="auto_sign_msg" checked={this.state.auto_sign_msg} onChange={this.handleCheck} />
                <span>{l10n.map.general_primary_key_auto_sign}</span>
              </label>
            </div>
          </div>
          <div className="form-group">
            <h4 className="control-label">{"OpenPGP"}</h4>
            <div className="checkbox">
              <label>
                <input type="checkbox" name="prefer_gnupg" checked={this.state.prefer_gnupg} onChange={this.handleCheck} />
                <span>{l10n.map.general_prefer_gnupg}</span>
              </label>
            </div>
          </div>
          <div className="form-group">
            <button type="button" onClick={this.handleSave} className="btn btn-primary" disabled={!this.state.modified}>{l10n.map.form_save}</button>
            <button type="button" onClick={this.handleCancel} className="btn btn-default" disabled={!this.state.modified}>{l10n.map.form_cancel}</button>
          </div>
        </form>
      </div>
    );
  }
}
