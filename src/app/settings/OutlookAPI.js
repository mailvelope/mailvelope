/**
 * Copyright (C) 2012-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {Link} from 'react-router-dom';
import {port, getAppDataSlot} from '../app';
import {matchPattern2RegExString} from '../../lib/util';
import * as l10n from '../../lib/l10n';
import Alert from '../../components/util/Alert';
import Modal from '../../components/util/Modal';

import './OutlookAPI.scss';

const OUTLOOK_SCOPE_MAIL_READ = 'https://graph.microsoft.com/Mail.Read';
const OUTLOOK_SCOPE_MAIL_SEND = 'https://graph.microsoft.com/Mail.Send';

l10n.register([
  'alert_header_error',
  'alert_header_important',
  'alert_header_notice',
  'alert_header_warning',
  'dialog_popup_close',
  'keygrid_user_email',
  'keygrid_refresh',
  'learn_more_link',
  'provider_gmail_auth',
  'provider_gmail_auth_cancel_btn',
  'provider_gmail_auth_readonly',
  'provider_gmail_auth_send',
  'provider_gmail_auth_table_title',
  'provider_gmail_dialog_auth_google_signin',
  'provider_gmail_dialog_auth_intro',
  'provider_gmail_dialog_auth_outro',
  'provider_gmail_dialog_description',
  'provider_gmail_dialog_gsuite_alert',
  'provider_gmail_dialog_privacy_policy',
  'provider_gmail_dialog_title',
  'provider_gmail_integration',
  'provider_gmail_integration_info',
  'provider_gmail_integration_warning',
  'provider_gmail_licensing_dialog_business_btn_info',
  'provider_gmail_licensing_dialog_business_btn_price_info',
  'provider_gmail_licensing_dialog_deactivate_btn',
  'provider_gmail_licensing_dialog_para_1',
  'provider_gmail_licensing_dialog_para_2',
  'provider_gmail_licensing_dialog_para_3',
  'provider_gmail_licensing_dialog_test_btn',
  'provider_gmail_licensing_dialog_title',
  'provider_gmail_licensing_table_caption',
  'provider_gmail_licensing_table_title',
  'settings_provider',
  'watchlist_title_scan'
]);

const OUTLOOK_MATCH_PATTERN = '*.outlook.office.com';

export default class OutlookAPI extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      outlook: false, // Outlook registered in authorized domains
      outlook_integration: false,
      outlook_authorized_emails: [],
      email: '',
      scopes: [],
      outlookCtrlId: '',
      watchList: null
    };
    this.handleOutlookSwitch = this.handleOutlookSwitch.bind(this);
  }

  async componentDidMount() {
    await this.loadPrefs();
    if (/\/auth$/.test(this.props.location.pathname)) {
      const data = await getAppDataSlot();
      this.openOAuthDialog(data);
    }
    // Note: License checking for Outlook is deferred to Phase 4/5
  }

  openOAuthDialog({email, scopes, outlookCtrlId}) {
    this.setState({showAuthModal: true, email, scopes, outlookCtrlId});
  }

  async getAuthorization() {
    try {
      const {email, scopes, outlookCtrlId} = this.state;
      await port.send('authorize-outlook', {email, scopes, outlookCtrlId});
      await this.loadAuthorisations();
    } catch (error) {
      this.props.onSetNotification({header: l10n.map.alert_header_warning, message: error.message, type: 'error', hideDelay: 10000});
    } finally {
      this.setState({showAuthModal: false});
    }
  }

  getAuthText(authorisation) {
    let text;
    switch (authorisation) {
      case OUTLOOK_SCOPE_MAIL_READ:
        text = 'Read messages';
        break;
      case OUTLOOK_SCOPE_MAIL_SEND:
        text = 'Send messages';
        break;
      default:
        text = '';
    }
    return text;
  }

  async loadPrefs() {
    const {provider} = await port.send('get-prefs');
    const outlook = await this.verifyHost(OUTLOOK_MATCH_PATTERN);
    this.setState({
      outlook,
      outlook_integration: provider.outlook_integration
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
    let outlookOAuthTokens = await port.send('get-oauth-tokens', {provider: 'outlook'});
    if (outlookOAuthTokens) {
      outlookOAuthTokens = Object.keys(outlookOAuthTokens).map(key => ({...outlookOAuthTokens[key], email: key}));
    } else {
      outlookOAuthTokens = [];
    }
    this.setState({outlook_authorized_emails: outlookOAuthTokens});
  }

  async loadWatchList() {
    const watchList = await port.send('getWatchList');
    return new Promise(resolve => this.setState({watchList}, resolve));
  }

  async removeAuthorisation(email) {
    await port.send('remove-oauth-token', {provider: 'outlook', email});
    await this.loadAuthorisations();
  }

  handleOutlookSwitch({target}) {
    this.setState({[target.name]: target.checked}, () => this.handleSave());
  }

  async handleSave() {
    const update = {
      provider: {
        outlook_integration: this.state.outlook_integration,
      }
    };
    await port.send('set-prefs', {prefs: update});
  }

  handleCancel() {
    this.loadPrefs();
  }

  authModal() {
    return (
      <Modal
        isOpen={this.state.showAuthModal}
        toggle={() => this.setState(prevState => ({showAuthModal: !prevState.showAuthModal}))}
        size="medium"
        title="Outlook API Authorization"
        footer={
          <div className="modal-footer justify-content-between">
            <button type="button" className="btn btn-secondary" onClick={() => this.setState({showAuthModal: false, outlook_integration: false}, () => this.handleSave())}>{l10n.map.dialog_popup_close}</button>
            {this.microsoftSignInButton()}
          </div>
        }
      >
        <>
          <p><span>Mailvelope needs permission to access your Outlook messages for encryption and decryption.</span> <a href="https://mailvelope.com/faq#outlook_permissions" target="_blank" rel="noopener noreferrer">{l10n.map.learn_more_link}</a></p>
          <p>The following permissions will be requested for <strong>{this.state.email}</strong>:</p>
          <ul>
            {this.state.scopes.map((entry, index) =>
              <li key={index}>
                {this.getAuthText(entry)}
              </li>
            )}
          </ul>
          <p>Your credentials are stored securely and only used to access messages on your behalf when using Mailvelope.</p>
          <p className="text-muted text-right mb-0">
            <small>
              <a href="https://mailvelope.com/en/privacy-policy" className="text-reset" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
            </small>
          </p>
        </>
      </Modal>
    );
  }

  microsoftSignInButton() {
    return (
      <button type="button" className="btn btn-primary" onClick={() => this.getAuthorization()}>
        Sign in with Microsoft
      </button>
    );
  }

  // License enforcement for Outlook is deferred to Phase 4/5
  // TODO: Implement licenseModal() for Microsoft 365 accounts
  // licenseModal() {
  //   return (
  //     <Modal>
  //       ... Microsoft 365 license checking UI ...
  //     </Modal>
  //   );
  // }

  render() {
    return (
      <div id="outlook-provider">
        <h2 className="mb-4">Outlook API</h2>
        <form>
          <div className="form-group mb-4">
            <div className="custom-control custom-switch">
              <input className="custom-control-input" disabled={!this.state.outlook} type="checkbox" id="outlook_integration" name="outlook_integration" checked={this.state.outlook_integration} onChange={this.handleOutlookSwitch} />
              <label className="custom-control-label" htmlFor="outlook_integration"><span>Enable Outlook Integration</span></label>
            </div>
            {!this.state.outlook && (
              <Alert className="mt-2" type="warning" header={l10n.map.alert_header_warning}>
                To use the Outlook integration, please add <strong>{OUTLOOK_MATCH_PATTERN}</strong> to the list of authorized domains in <Link to="/settings/watchlist">Authorized Domains</Link>.
              </Alert>
            )}
            {this.state.outlook && (
              <Alert className="mt-2" type="info" header={l10n.map.alert_header_important}>
                The Outlook integration allows Mailvelope to encrypt and decrypt messages directly in your Outlook inbox. <a href="https://mailvelope.com/faq#outlook_permissions" target="_blank" rel="noopener noreferrer">{l10n.map.learn_more_link}</a>
              </Alert>
            )}
            <p className="lead mt-3">Authorized Accounts</p>
            <div className="table-responsive">
              <table className="table table-provider table-custom mb-0">
                <thead>
                  <tr>
                    <th>{l10n.map.keygrid_user_email}</th>
                    <th>Permissions</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {this.state.outlook_authorized_emails.map((entry, index) =>
                    <tr key={index}>
                      <td>{entry.email}</td>
                      <td>{entry.scope.split(' ').map(val => this.getAuthText(val)).filter(val => val !== '').join(', ')}</td>
                      <td className="text-center">
                        <div className="actions">
                          <button type="button" onClick={() => this.removeAuthorisation(entry.email)} className="btn btn-sm btn-secondary">Remove</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* TODO: Microsoft 365 license enforcement will be added in Phase 4/5 */}
          </div>
        </form>
        {this.authModal()}
      </div>
    );
  }
}

OutlookAPI.propTypes = {
  location: PropTypes.object,
  onSetNotification: PropTypes.func
};
