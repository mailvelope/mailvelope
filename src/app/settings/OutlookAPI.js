/**
 * Copyright (C) 2012-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {Link} from 'react-router-dom';
import {port, getAppDataSlot} from '../app';
import {matchPattern2RegExString} from '../../lib/util';
import {ERROR_OUTLOOK_ACCOUNT_MISMATCH} from '../../lib/constants';
import * as l10n from '../../lib/l10n';
import Trans from '../../components/util/Trans';
import Alert from '../../components/util/Alert';
import Modal from '../../components/util/Modal';

import './OutlookAPI.scss';

const OUTLOOK_SCOPE_MAIL_READ = 'https://graph.microsoft.com/Mail.Read';
const OUTLOOK_SCOPE_MAIL_SEND = 'https://graph.microsoft.com/Mail.Send';

l10n.register([
  'alert_header_important',
  'alert_header_warning',
  'dialog_popup_close',
  'keygrid_user_email',
  'learn_more_link',
  'provider_gmail_mismatch_cancel_btn',
  'provider_gmail_mismatch_label_actual',
  'provider_gmail_mismatch_label_expected',
  'provider_gmail_mismatch_retry_btn',
  'provider_gmail_mismatch_why_summary',
  'provider_outlook_mismatch_intro',
  'provider_outlook_mismatch_step1',
  'provider_outlook_mismatch_step2',
  'provider_outlook_mismatch_title',
  'provider_outlook_mismatch_why_body'
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
      watchList: null,
      mismatch: null
    };
    this.handleOutlookSwitch = this.handleOutlookSwitch.bind(this);
    this.handleAuthCancel = this.handleAuthCancel.bind(this);
    this.handleMismatchRetry = this.handleMismatchRetry.bind(this);
    this.handleMismatchCancel = this.handleMismatchCancel.bind(this);
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

  async getAuthorization({forcePicker = false} = {}) {
    const {email, scopes, outlookCtrlId} = this.state;
    try {
      await port.send('authorize-outlook', {email, scopes, outlookCtrlId, forcePicker});
    } catch (error) {
      if (error.code === ERROR_OUTLOOK_ACCOUNT_MISMATCH && error.data) {
        this.setState({
          showAuthModal: false,
          mismatch: {
            intendedEmail: error.data.intendedEmail || email,
            actualEmail: error.data.actualEmail || ''
          }
        });
        return;
      }
      this.setState({showAuthModal: false, mismatch: null});
      this.props.onSetNotification({header: l10n.map.alert_header_warning, message: error.message, type: 'error', hideDelay: 10000});
      return;
    }
    this.setState({showAuthModal: false, mismatch: null});
    await this.loadAuthorisations();
  }

  handleMismatchRetry() {
    this.getAuthorization({forcePicker: true});
  }

  handleMismatchCancel() {
    const {outlookCtrlId} = this.state;
    this.setState({mismatch: null, outlook_integration: false}, () => this.handleSave());
    if (outlookCtrlId) {
      port.emit('cancel-authorize-outlook', {outlookCtrlId});
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

  handleAuthCancel() {
    const {outlookCtrlId} = this.state;
    this.setState({showAuthModal: false, outlook_integration: false}, () => this.handleSave());
    if (outlookCtrlId) {
      port.emit('cancel-authorize-outlook', {outlookCtrlId});
    }
  }

  authModal() {
    return (
      <Modal
        isOpen={this.state.showAuthModal}
        toggle={this.handleAuthCancel}
        size="medium"
        title="Outlook API Authorization"
        footer={
          <div className="modal-footer justify-content-between">
            <button type="button" className="btn btn-secondary" onClick={this.handleAuthCancel}>{l10n.map.dialog_popup_close}</button>
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

  mismatchModal() {
    const {mismatch} = this.state;
    const intended = mismatch?.intendedEmail || '';
    const actual = mismatch?.actualEmail || '';
    const rows = [
      {modifier: 'expected', icon: 'icon-checkmark', label: l10n.map.provider_gmail_mismatch_label_expected, email: intended},
      {modifier: 'actual', icon: 'icon-close', label: l10n.map.provider_gmail_mismatch_label_actual, email: actual}
    ];
    return (
      <Modal
        isOpen={Boolean(mismatch)}
        toggle={this.handleMismatchCancel}
        size="medium"
        title={l10n.map.provider_outlook_mismatch_title}
        headerClass="text-danger"
        footer={
          <div className="modal-footer justify-content-between">
            <button type="button" className="btn btn-secondary" onClick={this.handleMismatchCancel}>{l10n.map.provider_gmail_mismatch_cancel_btn}</button>
            <button type="button" className="btn btn-primary" onClick={this.handleMismatchRetry}>{l10n.map.provider_gmail_mismatch_retry_btn}</button>
          </div>
        }
      >
        <div className="account-mismatch">
          <p className="account-mismatch__intro">{l10n.map.provider_outlook_mismatch_intro}</p>
          <div className="account-mismatch__compare">
            {rows.map(({modifier, icon, label, email}) => (
              <div key={modifier} className={`account-mismatch__row account-mismatch__row--${modifier}`}>
                <span className={`icon ${icon} account-mismatch__icon`} aria-hidden="true"></span>
                <span className="account-mismatch__label">{label}</span>
                <span className="account-mismatch__email">{email}</span>
              </div>
            ))}
          </div>
          <ol className="account-mismatch__steps">
            <li>{l10n.map.provider_outlook_mismatch_step1}</li>
            <li><Trans id={l10n.map.provider_outlook_mismatch_step2} components={[<strong key="0">{intended}</strong>]} /></li>
          </ol>
          <details className="account-mismatch__details">
            <summary>{l10n.map.provider_gmail_mismatch_why_summary}</summary>
            <p>{l10n.map.provider_outlook_mismatch_why_body}</p>
          </details>
        </div>
      </Modal>
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
        {this.mismatchModal()}
      </div>
    );
  }
}

OutlookAPI.propTypes = {
  location: PropTypes.object,
  onSetNotification: PropTypes.func
};
