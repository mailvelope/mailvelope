/**
 * Copyright (C) 2022 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import * as l10n from '../../lib/l10n';
import {PROVIDER_CAMPAIGN} from '../../lib/analytics';
import {port} from '../app';

l10n.register([
  'form_cancel',
  'form_save',
  'provider_analytics_consent',
  'settings_analytics',
  'provider_analytics_consent_description',
]);

export default class Analytics extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      providerAnalyticsConsent: false,
      modified: false,
    };
    this.getCurrentConsents = this.getCurrentConsents.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
  }

  componentDidMount() {
    this.getCurrentConsents();
  }

  getCurrentConsents() {
    port.send('get-consent', [PROVIDER_CAMPAIGN]).then(consent => {
      this.setState({providerAnalyticsConsent: consent});
    });
  }

  handleChange(event) {
    const target = event.target;
    this.setState(() => {
      const update = {
        [target.name]: target.checked,
        modified: true,
      };
      return update;
    });
  }

  handleSave() {
    if (this.state.providerAnalyticsConsent) {
      // TODO: can this be repeatedly granted idempotently?
      port.emit('grant-consent', [PROVIDER_CAMPAIGN]);
    } else {
      port.emit('deny-consent', [PROVIDER_CAMPAIGN]);
    }
    this.setState({modified: false});
  }

  handleCancel() {
    this.getCurrentConsents();
    this.setState({modified: false});
  }

  render() {
    return (
      <div id="analytics">
        <h2 className="mb-4">{l10n.map.settings_analytics}</h2>
        <div className="form-group mb-4">
          <h3>{l10n.map.provider_analytics_consent}</h3>
          <div className="custom-control custom-checkbox">
            <input className="custom-control-input" type="checkbox" checked={this.state.providerAnalyticsConsent} onChange={this.handleChange} id="providerAnalyticsConsent" name="providerAnalyticsConsent"></input>
            <label className="custom-control-label" htmlFor="providerAnalyticsConsent">{l10n.map.provider_analytics_consent_description}</label>
          </div>
        </div>
        <div className="btn-bar">
          <button type="button" id="secBtnSave" className="btn btn-primary" onClick={this.handleSave} disabled={!this.state.modified}>{l10n.map.form_save}</button>
          <button type="button" className="btn btn-secondary" onClick={this.handleCancel} disabled={!this.state.modified}>{l10n.map.form_cancel}</button>
        </div>
      </div>
    );
  }
}
