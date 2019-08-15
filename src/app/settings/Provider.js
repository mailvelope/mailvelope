/**
 * Copyright (C) 2012-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import {Link} from 'react-router-dom';
import {port} from '../app';
import {matchPattern2RegExString} from '../../lib/util';
import * as l10n from '../../lib/l10n';
import Trans from '../../components/util/Trans';
import Alert from '../../components/util/Alert';

l10n.register([
  'form_cancel',
  'form_save',
  'header_warning',
  'provider_gmail_integration',
  'provider_gmail_integration_warning',
  'settings_provider'
]);

const GMAIL_MATCH_PATTERN = '*.mail.google.com';

export default class Provider extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      gmail: false,
      gmail_integration: false,
      gmail_authorized_emails: [],
      watchList: null,
      modified: false,
    };
    this.handleCheck = this.handleCheck.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
  }

  componentDidMount() {
    this.loadPrefs();
  }

  async loadPrefs() {
    const {provider} = await port.send('get-prefs');
    const gmail = await this.verifyHost(GMAIL_MATCH_PATTERN);
    this.setState({
      gmail,
      gmail_integration: provider.gmail_integration,
      modified: false
    });
    await this.loadAuthorisations();
  }

  async verifyHost(host) {
    if (!this.state.watchList) {
      await this.loadWatchList();
    }
    const regex = new RegExp(matchPattern2RegExString(host));
    const match = this.state.watchList.some(({active, frames}) => active && frames.some(({scan, frame}) => scan && regex.test((frame))));
    return match;
  }

  async loadAuthorisations() {
    let gmailOAuthTokens = await port.send('get-oauth-tokens', {provider: 'gmail'});
    if (gmailOAuthTokens) {
      gmailOAuthTokens = Object.keys(gmailOAuthTokens).map(key => ({...gmailOAuthTokens[key], email: key}));
    } else {
      gmailOAuthTokens = [];
    }
    this.setState({gmail_authorized_emails: gmailOAuthTokens});
  }

  async loadWatchList() {
    const watchList = await port.send('getWatchList');
    this.setState({watchList});
  }

  async removeAuthorisation(email) {
    await port.send('remove-oauth-token', {provider: 'gmail', email});
    await this.loadAuthorisations();
  }

  handleCheck({target}) {
    this.setState({[target.name]: target.checked, modified: true});
  }

  async handleSave() {
    const update = {
      provider: {
        gmail_integration: this.state.gmail_integration,
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
      <div id="provider">
        <h2 className="mb-4">{l10n.map.settings_provider}</h2>
        <form>
          <div className="form-group mb-4">
            <h3>Gmail</h3>
            <div className="custom-control custom-checkbox">
              <input className="custom-control-input" disabled={!this.state.gmail} type="checkbox" id="gmail_integration" name="gmail_integration" checked={this.state.gmail_integration} onChange={this.handleCheck} />
              <label className="custom-control-label" htmlFor="gmail_integration"><span>{l10n.map.provider_gmail_integration}</span></label>
            </div>
            {!this.state.gmail && (
              <Alert className="mt-2" type="warning" header={l10n.map.header_warning}>
                <div>
                  <Trans id={l10n.map.provider_gmail_integration_warning} components={[
                    <strong key="0">{GMAIL_MATCH_PATTERN}</strong>,
                    <Link key="1" to="/settings/watchlist">{l10n.map.dashboard_link_manage_domains}</Link>
                  ]} />
                </div>
              </Alert>
            )}
            <p className="lead mt-3">Authorisierungen</p>
            <div className="table-responsive">
              <table className="table table-hover table-custom mb-0">
                <thead>
                  <tr>
                    <th>E-Mail</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {this.state.gmail_authorized_emails.map((entry, index) =>
                    <tr key={index}>
                      <td>{entry.email}</td>
                      <td className="text-center">
                        <div className="actions">
                          <button type="button" onClick={e => { e.stopPropagation(); this.removeAuthorisation(entry.email); }} className="btn btn-secondary">Authorisierung aufheben</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="btn-bar">
            <button type="button" onClick={this.handleSave} className="btn btn-primary" disabled={!this.state.modified}>{l10n.map.form_save}</button>
            <button type="button" onClick={this.handleCancel} className="btn btn-secondary" disabled={!this.state.modified}>{l10n.map.form_cancel}</button>
          </div>
        </form>
      </div>
    );
  }
}
