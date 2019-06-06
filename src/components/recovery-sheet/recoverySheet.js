/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../lib/l10n';
import EventHandler from '../../lib/EventHandler';
import SecurityBG from '../util/SecurityBG';

import './RecoverySheet.css';

// register language strings
l10n.register([
  'recovery_sheet_backup_data',
  'recovery_sheet_be_aware',
  'recovery_sheet_check_settings',
  'recovery_sheet_creation_date',
  'recovery_sheet_data_lost',
  'recovery_sheet_enter_code',
  'recovery_sheet_extension_problems',
  'recovery_sheet_forgot_password',
  'recovery_sheet_header',
  'recovery_sheet_in_general',
  'recovery_sheet_keep_safe',
  'recovery_sheet_mobile_devices',
  'recovery_sheet_not_working',
  'recovery_sheet_other_computer',
  'recovery_sheet_other_contacts',
  'recovery_sheet_other_devices',
  'recovery_sheet_other_devices_setup',
  'recovery_sheet_other_problems',
  'recovery_sheet_pgp_compat',
  'recovery_sheet_print_block',
  'recovery_sheet_print_button',
  'recovery_sheet_print_notice',
  'recovery_sheet_provider_communication',
  'recovery_sheet_provider_inbox',
  'recovery_sheet_provider_security',
  'recovery_sheet_provider_settings',
  'recovery_sheet_qr_code',
  'recovery_sheet_recommendation',
  'recovery_sheet_recover_data',
  'recovery_sheet_recovery_code',
  'recovery_sheet_subtitle_receipt',
  'recovery_sheet_subtitle_recover',
  'recovery_sheet_trusted_contacts',
  'recovery_sheet_unknown_third',
  'recovery_sheet_unlock_backup'
]);

export default class RecoverySheet extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      brand: this.setBrand(props.brand),
      backupCode: null,
      logoDataUrl: null,
      date: (new Date()).toLocaleDateString()
    };
    this.port = EventHandler.connect(`recoverySheet-${props.id}`, this);
    this.registerEventListeners();
    this.port.emit('get-logo-image');
    this.port.emit('get-backup-code');
  }

  registerEventListeners() {
    this.port.on('set-backup-code', ({backupCode}) => this.setBackupCode(backupCode));
    this.port.on('set-logo-image', ({image}) => this.setState({logoDataUrl: image}));
  }

  setBackupCode(code) {
    new QRCode(this.qrCode, { // eslint-disable-line no-undef
      text: code,
      width: 175,
      height: 175,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H // eslint-disable-line no-undef
    });
    this.setState({backupCode: code}, this.port.emit('backup-code-window-init'));
  }

  setBrand(brandId) {
    if (!brandId) {
      return '';
    }
    let brand;
    switch (brandId) {
      case 'webde':
        brand = 'WEB.DE';
        break;
      case 'gmx':
        brand = 'GMX';
        break;
      default:
        throw new Error('Unknown brand');
    }
    return brand;
  }

  render() {
    return (
      <div className={`recovery-sheet ${this.props.brand || ''}`}>
        <header className="recovery-sheet_teaser">
          <img src="assets/lock.png" />
          <h1>{l10n.map.recovery_sheet_header}</h1>
          <img src="assets/lock.png" />
        </header>
        <section className="recovery-sheet_content container">
          <div className="row">
            <div className="col-2">
              <img src={this.state.logoDataUrl ? this.state.logoDataUrl : '../../img/Mailvelope/logo_signet_96.png'} className="logo" />
            </div>
            <div className="col-10">
              <h2>{l10n.map.recovery_sheet_subtitle_receipt}</h2>
              <h3 className="d-print-none">{l10n.map.recovery_sheet_print_notice}</h3>
              <h3 className="d-none d-print-flex">{l10n.map.recovery_sheet_print_block}</h3>
            </div>
          </div>
          <section className="recovery-sheet_print d-print-none">
            <img src="assets/printer.png" />
            <button type="button" onClick={() => window.print()} className="recovery-sheet_print-button">{l10n.map.recovery_sheet_print_button}</button>
            <img src="assets/printer.png" />
          </section>
          <section className="recovery-sheet_panel">
            <div className="recovery-sheet_panel-content">
              <div className="recovery-sheet_code">
                <div className="recovery-sheet_code-header">
                  <h3>{l10n.map.recovery_sheet_recovery_code}</h3>
                  <h3><span>{l10n.map.recovery_sheet_creation_date}</span> <span>{this.state.date}</span></h3>
                </div>
                {this.state.backupCode && (
                  <SecurityBG className="recovery-sheet_code-container" port={this.port}>
                    <span className="recovery-sheet_code-digit">{this.state.backupCode.substr(0, 5)}</span>
                    <span className="recovery-sheet_code-separator">-</span>
                    <span className="recovery-sheet_code-digit">{this.state.backupCode.substr(5, 5)}</span>
                    <span className="recovery-sheet_code-separator">-</span>
                    <span className="recovery-sheet_code-digit">{this.state.backupCode.substr(10, 5)}</span>
                    <span className="recovery-sheet_code-separator">-</span>
                    <span className="recovery-sheet_code-digit">{this.state.backupCode.substr(15, 5)}</span>
                    <span className="recovery-sheet_code-separator">-</span>
                    <span className="recovery-sheet_code-digit">{this.state.backupCode.substr(20, 5)}</span>
                    <span className="recovery-sheet_code-separator">-</span>
                    <span className="recovery-sheet_code-digit">{this.state.backupCode.substr(25, 1)}</span>
                  </SecurityBG>
                )}
              </div>
              <div className="recovery-sheet_plain-content">
                <h3>{l10n.map.recovery_sheet_subtitle_recover}</h3>
                <p>{l10n.map.recovery_sheet_not_working}</p>
                <ul>
                  <li>{l10n.map.recovery_sheet_forgot_password}</li>
                  <li>{l10n.map.recovery_sheet_extension_problems}</li>
                  <li>{l10n.map.recovery_sheet_other_problems}</li>
                </ul>
                {this.props.brand && (
                  <>
                    <p>{l10n.map.recovery_sheet_check_settings}</p>
                    <p><em>{l10n.map.recovery_sheet_provider_inbox}</em> &gt; <em>{l10n.map.recovery_sheet_provider_settings}</em> &gt; <em className="gmx-specific">{l10n.map.recovery_sheet_provider_security}</em><span className="gmx-specific"> &gt; </span><em>{l10n.map.recovery_sheet_provider_communication}</em>.</p>
                  </>
                )}
              </div>
            </div>
          </section>
          <section className="recovery-sheet_panel">
            <div className="recovery-sheet_panel-content">
              <h3>{l10n.map.recovery_sheet_other_devices}</h3>
              <div className="recovery-sheet_devices">
                <div className="recovery-sheet_devices-item recovery-sheet_devices-desktop">
                  <div className="recovery-sheet_devices-split-content">
                    <h4>{l10n.map.recovery_sheet_other_computer}</h4>
                    <img src={`assets/${!this.props.brand ? 'webde' : this.props.brand}/desktop.png`} className="desktop-image" />
                  </div>
                  {this.props.brand && (
                    <>
                      <p>{l10n.map.recovery_sheet_enter_code}</p>
                      <p><em>{l10n.map.recovery_sheet_provider_inbox}</em> &gt; <em>{l10n.map.recovery_sheet_provider_settings}</em> &gt; <em className="gmx-specific">{l10n.map.recovery_sheet_provider_security}</em><span className="gmx-specific"> &gt; </span><em>{l10n.map.recovery_sheet_provider_communication}</em>.</p>
                    </>
                  )}
                </div>
                <div className="recovery-sheet_devices-item recovery-sheet_devices-mobile">
                  <div className="recovery-sheet_devices-split-content">
                    <h4>{l10n.map.recovery_sheet_mobile_devices}</h4>
                    <img src={`assets/${!this.props.brand ? 'webde' : this.props.brand}/smartphone.png`} className="smartphone-image" />
                    <img src={`assets/${!this.props.brand ? 'webde' : this.props.brand}/tablet.png`} className="tablet-image" />
                  </div>
                  <div className="recovery-sheet_devices-split-content">
                    <p>{l10n.map.recovery_sheet_qr_code}</p>
                    <div id="qrcode" ref={ref => this.qrCode = ref}></div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          <section className="recovery-sheet_print d-print-none">
            <img src="assets/printer.png" />
            <button type="button" className="recovery-sheet_print-button" onClick={() => window.print()}>{l10n.map.recovery_sheet_print_button}</button>
            <img src="assets/printer.png" />
          </section>
        </section>
        <footer className="recovery-sheet_teaser d-none d-print-flex">
          <img src="assets/lock.png" />
          <h1>{l10n.map.recovery_sheet_header}</h1>
          <img src="assets/lock.png" />
        </footer>
        {this.props.brand && (
          <>
            <hr className="page-breaker" />
            <header className="recovery-sheet_teaser">
              <img src="assets/lock.png" />
              <h1>{l10n.map.recovery_sheet_header}</h1>
              <img src="assets/lock.png" />
            </header>
            <section className="recovery-sheet_content container">
              <div className="row">
                <div className="col-2">
                  <img src={this.state.logoDataUrl ? this.state.logoDataUrl : '../../img/Mailvelope/logo_signet_96.png'} className="logo" />
                </div>
                <div className="col-10">
                  <h2>{l10n.get('recovery_sheet_encryption_note', this.state.brand)}</h2>
                  <p>{l10n.get('recovery_sheet_explain_pgp', this.state.brand)}</p>
                  <div className="recovery-sheet_description">
                    <h4>{l10n.map.recovery_sheet_backup_data}</h4>
                    <ul>
                      <li>{l10n.get('recovery_sheet_backup_server', this.state.brand)}</li>
                      <li>{l10n.get('recovery_sheet_backup_local', this.state.brand)}</li>
                      <li><em>{l10n.map.recovery_sheet_be_aware}</em>: <span>{l10n.map.recovery_sheet_data_lost}</span></li>
                    </ul>
                    <h4>{l10n.map.recovery_sheet_recover_data}</h4>
                    <ul>
                      <li>{l10n.map.recovery_sheet_unlock_backup}</li>
                      <li><em>{l10n.map.recovery_sheet_recommendation}</em>: <span>{l10n.map.recovery_sheet_keep_safe}</span></li>
                    </ul>
                    <h4>{l10n.map.recovery_sheet_other_contacts}</h4>
                    <ul>
                      <li>{l10n.map.recovery_sheet_pgp_compat}</li>
                      <li>{l10n.get('recovery_sheet_key_server', this.state.brand)}</li>
                      <li>{l10n.get('recovery_sheet_invite_contacts', this.state.brand)}</li>
                      <li><em>{l10n.map.recovery_sheet_recommendation}</em>: <span>{l10n.map.recovery_sheet_trusted_contacts}</span></li>
                    </ul>
                    <h4>{l10n.map.recovery_sheet_other_devices_setup}</h4>
                    <ul>
                      <li><em>{l10n.map.recovery_sheet_in_general}</em>: <span>{l10n.map.recovery_sheet_unknown_third}</span></li>
                    </ul>
                  </div>

                  <p><span>{l10n.get('recovery_sheet_further_info', this.state.brand)}</span> <em className="gmx-specific">{l10n.map.recovery_sheet_provider_inbox}</em><span className="gmx-specific"> &gt; </span><em>{l10n.map.recovery_sheet_provider_settings}</em> &gt; <em className="gmx-specific">{l10n.map.recovery_sheet_provider_security}</em><span className="gmx-specific"> &gt; </span><em>{l10n.map.recovery_sheet_provider_communication}</em>.</p>
                </div>
              </div>
              <section className="recovery-sheet_print d-print-none">
                <img src="assets/printer.png" />
                <button type="button" onClick={() => window.print()} className="recovery-sheet_print-button">{l10n.map.recovery_sheet_print_button}</button>
                <img src="assets/printer.png" />
              </section>
            </section>
            <footer className="recovery-sheet_teaser">
              <img src="assets/lock.png" />
              <h1>{l10n.map.recovery_sheet_header}</h1>
              <img src="assets/lock.png" />
            </footer>
          </>
        )}
      </div>
    );
  }
}

RecoverySheet.propTypes = {
  id: PropTypes.string,
  brand: PropTypes.string
};
