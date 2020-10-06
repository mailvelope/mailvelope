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
import Trans from '../../components/util/Trans';
import Alert from '../../components/util/Alert';
import Modal from '../../components/util/Modal';

import './Provider.scss';

const GMAIL_SCOPE_READONLY = 'https://www.googleapis.com/auth/gmail.readonly';
const GMAIL_SCOPE_SEND = 'https://www.googleapis.com/auth/gmail.send';
const MV_PRODUCT_PAGE_URL = 'https://www.mailvelope.com/products?referrer=mailvelope-extension';

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

const GMAIL_MATCH_PATTERN = '*.mail.google.com';

export default class Provider extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      gmail: false, // Gmail registered in authorized domains
      gmail_integration: false,
      gmail_authorized_emails: [],
      email: '',
      legacyGsuite: false,
      scopes: [],
      gmailCtrlId: '',
      watchList: null
    };
    this.handleGmailSwitch = this.handleGmailSwitch.bind(this);
    this.handleTestAPI = this.handleTestAPI.bind(this);
  }

  async componentDidMount() {
    await this.loadPrefs();
    if (/\/auth$/.test(this.props.location.pathname)) {
      const data = await getAppDataSlot();
      this.openOAuthDialog(data);
    } else if (/\/license$/.test(this.props.location.pathname)) {
      let {email} = await getAppDataSlot() || {};
      if (email) {
        sessionStorage.setItem('license-email', email);
      } else {
        email = sessionStorage.getItem('license-email');
      }
      this.checkLicense(email);
    }
  }

  async checkLicense(email) {
    if (!email) {
      return;
    }
    try {
      await port.send('check-license', {email});
      await this.loadAuthorisations();
    } catch (error) {
      this.setState({showLicenseModal: true});
    }
  }

  openOAuthDialog({email, legacyGsuite, scopes, gmailCtrlId}) {
    this.setState({showAuthModal: true, email, legacyGsuite, scopes, gmailCtrlId});
  }

  async getAuthorization() {
    try {
      const {email, legacyGsuite, scopes, gmailCtrlId} = this.state;
      await port.send('authorize-gmail', {email, legacyGsuite, scopes, gmailCtrlId});
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
      case GMAIL_SCOPE_READONLY:
        text = l10n.map.provider_gmail_auth_readonly;
        break;
      case GMAIL_SCOPE_SEND:
        text = l10n.map.provider_gmail_auth_send;
        break;
      default:
        text = '';
    }
    return text;
  }

  async loadPrefs() {
    const {provider} = await port.send('get-prefs');
    const gmail = await this.verifyHost(GMAIL_MATCH_PATTERN);
    this.setState({
      gmail,
      gmail_integration: provider.gmail_integration
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

  handleTestAPI() {
    this.setState({showLicenseModal: false});
    window.open(`${MV_PRODUCT_PAGE_URL}&plan=mailvelope-business`, '_blank', 'noreferrer');
  }

  handleGmailSwitch({target}) {
    this.setState({[target.name]: target.checked}, () => this.handleSave());
  }

  async handleSave() {
    const update = {
      provider: {
        gmail_integration: this.state.gmail_integration,
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
        title={l10n.map.provider_gmail_dialog_title}
        footer={
          <div className="modal-footer justify-content-between">
            <button type="button" className="btn btn-secondary" onClick={() => this.setState({showAuthModal: false, gmail_integration: false}, () => this.handleSave())}>{l10n.map.dialog_popup_close}</button>
            {this.googleSignInButton()}
          </div>
        }
      >
        <>
          <p><span>{l10n.map.provider_gmail_dialog_description}</span> <a href="https://www.mailvelope.com/faq#gmail_permissions" target="_blank" rel="noopener noreferrer">{l10n.map.learn_more_link}</a></p>
          {!this.state.legacyGsuite &&
            <Alert type="warning" header={l10n.map.alert_header_notice}>
              <Trans id={l10n.map.provider_gmail_dialog_gsuite_alert} components={[
                <a key="0" href="https://gsuite.google.com/" target="_blank" rel="noopener noreferrer"></a>,
                <a key="1" href={MV_PRODUCT_PAGE_URL} target="_blank" rel="noopener noreferrer"></a>
              ]} />
            </Alert>
          }
          <p><Trans id={l10n.map.provider_gmail_dialog_auth_intro} components={[<strong key="0">{this.state.email}</strong>]} /></p>
          <ul>
            {this.state.scopes.map((entry, index) =>
              <li key={index}>
                {this.getAuthText(entry)}
              </li>
            )}
          </ul>
          <p><Trans id={l10n.map.provider_gmail_dialog_auth_outro} components={[<strong key="0">{this.state.email}</strong>]} /></p>
          <p className="text-muted text-right mb-0">
            <small>
              <a href="https://www.mailvelope.com/en/privacy-policy" className="text-reset" target="_blank" rel="noopener noreferrer">{l10n.map.provider_gmail_dialog_privacy_policy}</a>
            </small>
          </p>
        </>
      </Modal>
    );
  }

  googleSignInButton() {
    return (
      <button type="button" className="gSignInButton gSignInButtonBlue" onClick={() => this.getAuthorization()}>
        <div className="gSignInButtonContentWrapper">
          <div className="gSignInButtonIcon">
            <img width="18px" height="18px" className="gSignInButtonSvg" src="../../../img/btn_google_sign_in.svg" />
          </div>
          <span className="gSignInButtonContents">
            <span>{l10n.map.provider_gmail_dialog_auth_google_signin}</span>
          </span>
        </div>
      </button>
    );
  }

  licenseModal() {
    return (
      <Modal
        isOpen={this.state.showLicenseModal}
        toggle={() => this.setState(prevState => ({showLicenseModal: !prevState.showLicenseModal}))}
        size="large"
        title={l10n.map.provider_gmail_licensing_dialog_title}
        footer={
          <div className="modal-footer">
            <button type="button" onClick={() => this.setState({showLicenseModal: false, gmail_integration: false}, () => this.handleSave())} className="btn btn-secondary flex-grow-1">{l10n.map.provider_gmail_licensing_dialog_deactivate_btn}</button>
            <button type="button" className="btn btn-primary flex-grow-1" onClick={this.handleTestAPI}>{l10n.map.provider_gmail_licensing_dialog_test_btn}</button>
          </div>
        }
      >
        <div className="licensing-dialog">
          <p>
            <Trans id={l10n.map.provider_gmail_licensing_dialog_para_1} components={[
              <strong key="0"></strong>
            ]} />
          </p>
          <p>
            <Trans id={l10n.map.provider_gmail_licensing_dialog_para_2} components={[
              <strong key="0"></strong>, <strong key="1"></strong>
            ]} />
          </p>
          <p>
            <Trans id={l10n.map.provider_gmail_licensing_dialog_para_3} components={[
              <strong key="0"></strong>
            ]} />
          </p>
          <a className="btn btn-light d-flex align-items-center justify-content-between" href={MV_PRODUCT_PAGE_URL} target="_blank" rel="noopener noreferrer">
            <img className="mr-2" src="../img/Mailvelope/product-business.svg" role="presentation" />
            <div className="d-flex flex-column align-items-start mr-2">
              <h3>Business</h3>
              <span className="text-muted">{l10n.map.provider_gmail_licensing_dialog_business_btn_info}</span>
            </div>
            <div className="d-flex flex-column justify-content-center align-items-center mr-2">
              <span className="price-tag">3 &euro;</span>
              <span className="price-info text-muted">{l10n.map.provider_gmail_licensing_dialog_business_btn_price_info}</span>
            </div>
            <span className="icon icon-arrow-right"></span>
          </a>
        </div>
      </Modal>
    );
  }

  render() {
    const gmail_authorized_gsuite = this.state.gmail_authorized_emails.filter(entry => entry.gsuite);
    return (
      <div id="provider">
        <h2 className="mb-4">{l10n.map.settings_provider}</h2>
        <form>
          <div className="form-group mb-4">
            <div className="custom-control custom-switch">
              <input className="custom-control-input" disabled={!this.state.gmail} type="checkbox" id="gmail_integration" name="gmail_integration" checked={this.state.gmail_integration} onChange={this.handleGmailSwitch} />
              <label className="custom-control-label" htmlFor="gmail_integration"><span>{l10n.map.provider_gmail_integration}</span></label>
            </div>
            {!this.state.gmail && (
              <Alert className="mt-2" type="warning" header={l10n.map.alert_header_warning}>
                <Trans id={l10n.map.provider_gmail_integration_warning} components={[
                  <strong key="0">{GMAIL_MATCH_PATTERN}</strong>,
                  <Link key="1" to="/settings/watchlist">{l10n.map.dashboard_link_manage_domains}</Link>
                ]} />
              </Alert>
            )}
            {this.state.gmail && (
              <Alert className="mt-2" type="info" header={l10n.map.alert_header_important}>
                {l10n.map.provider_gmail_integration_info} <a href="https://www.mailvelope.com/faq#gmail_permissions" target="_blank" rel="noopener noreferrer">{l10n.map.learn_more_link}</a>
              </Alert>
            )}
            <p className="lead mt-3">{l10n.map.provider_gmail_auth_table_title}</p>
            <div className="table-responsive">
              <table className="table table-provider table-custom mb-0">
                <thead>
                  <tr>
                    <th>{l10n.map.keygrid_user_email}</th>
                    <th>{l10n.map.provider_gmail_auth}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {this.state.gmail_authorized_emails.map((entry, index) =>
                    <tr key={index}>
                      <td>{entry.email}</td>
                      <td>{entry.scope.split(' ').map(val => this.getAuthText(val)).filter(val => val !== '').join(', ')}</td>
                      <td className="text-center">
                        <div className="actions">
                          <button type="button" onClick={() => this.removeAuthorisation(entry.email)} className="btn btn-sm btn-secondary">{l10n.map.provider_gmail_auth_cancel_btn}</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {gmail_authorized_gsuite.length > 0 && (
              <>
                <p className="lead mt-3">{l10n.map.provider_gmail_licensing_table_title}</p>
                <div className="table-responsive">
                  <table className="table table-provider table-custom mb-0">
                    <caption>
                      <Trans id={l10n.map.provider_gmail_licensing_table_caption} components={[
                        <a key="0" href="https://gsuite.google.com/" target="_blank" rel="noopener noreferrer"></a>,
                        <a key="1" href={MV_PRODUCT_PAGE_URL} target="_blank" rel="noopener noreferrer"></a>
                      ]} />
                    </caption>
                    <thead>
                      <tr>
                        <th>{l10n.map.keygrid_user_email}</th>
                        <th className="text-center">{l10n.map.watchlist_title_scan}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {gmail_authorized_gsuite.map((entry, index) =>
                        <tr key={index}>
                          <td>{entry.email}</td>
                          {entry.mvelo_license_issued ? (
                            <td className="text-center"><span className="badge badge-pill badge-success">Mailvelope Business</span></td>
                          ) : (
                            entry.legacyGsuite ? (
                              <td className="text-center"><span className="badge badge-pill badge-success">G Suite legacy free</span></td>
                            ) : (
                              <td className="text-center"><span className="icon icon-marker text-danger" aria-hidden="true"></span></td>
                            )
                          )}
                          <td className="text-center">
                            <div className="actions">
                              <button type="button" onClick={() => this.checkLicense(entry.email)} className="btn btn-sm btn-secondary" disabled={entry.mvelo_license_issued || entry.legacyGsuite ? true : ''}>{l10n.map.keygrid_refresh}</button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </form>
        {this.authModal()}
        {this.licenseModal()}
      </div>
    );
  }
}

Provider.propTypes = {
  location: PropTypes.object,
  onSetNotification: PropTypes.func
};
