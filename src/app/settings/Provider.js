/**
 * Copyright (C) 2012-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import {Link} from 'react-router-dom';
import {port} from '../app';
import {matchPattern2RegExString} from '../../lib/util';
import * as l10n from '../../lib/l10n';
import Alert from '../../components/util/Alert';

l10n.register([
  'form_cancel',
  'form_save',
  'provider_gmail_integration',
  'settings_provider'
]);

const GMAIL_MATCH_PATTERN = '*.mail.google.com';

export default class Provider extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      gmail: false,
      gmail_integration: false,
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
  }

  async verifyHost(host) {
    if (!this.state.watchList) {
      await this.loadWatchList();
    }
    const regex = new RegExp(matchPattern2RegExString(host));
    const match = this.state.watchList.some(({active, frames}) => active && frames.some(({scan, frame}) => scan && regex.test((frame))));
    return match;
  }

  async loadWatchList() {
    const watchList = await port.send('getWatchList');
    this.setState({watchList});
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
              <Alert className="mt-2" type="warning" header="Achtung!">
                <span>Gmail ist mit dem Suchmuster <strong>{GMAIL_MATCH_PATTERN}</strong> nicht autorisiert. Bitte prüfen Sie die Einstellungen in </span>
                <Link to="/settings/watchlist">
                  {l10n.map.dashboard_link_manage_domains}
                </Link>
              </Alert>
            )}
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
