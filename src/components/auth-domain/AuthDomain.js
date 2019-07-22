/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../lib/l10n';
import EventHandler from '../../lib/EventHandler';
import SecurityBG from '../util/SecurityBG';
import Spinner from '../util/Spinner';

l10n.register([
  'auth_domain_api_label',
  'auth_domain_headline',
  'form_cancel',
  'form_confirm',
  'form_no',
  'form_yes',
  'watchlist_title_frame'
]);

export default class AuthDomain extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      waiting: true,
      frame: null,
    };
    this.handleCancel = this.handleCancel.bind(this);
    this.handleConfirm = this.handleConfirm.bind(this);
    this.port = EventHandler.connect(`authDomainDialog-${this.props.id}`, this);
    this.registerEventListeners();
    this.port.emit('auth-domain-dialog-init');
  }

  registerEventListeners() {
    this.port.on('set-frame', frame => this.setState({frame, waiting: false}));
  }

  logUserInput(type) {
    this.port.emit('auth-domain-user-input', {
      source: 'security_log_auth_domain_dialog',
      type
    });
  }

  handleCancel() {
    this.logUserInput('security_log_dialog_cancel');
    this.port.emit('auth-domain-dialog-cancel');
  }

  handleConfirm() {
    this.logUserInput('security_log_dialog_ok');
    this.port.emit('auth-domain-dialog-ok');
  }

  render() {
    return (
      <SecurityBG port={this.port}>
        <div className="modal d-block p-5">
          <div className="modal-dialog h-100 mw-100 m-0">
            <div className="modal-content shadow-lg border-0 h-100">
              {this.state.waiting ? (
                <Spinner style={{margin: 'auto auto'}} />
              ) : (
                <>
                  <div className="modal-header justify-content-center border-0 p-4 flex-shrink-0">
                    <h4 className="modal-title">{l10n.map.auth_domain_headline}</h4>
                  </div>
                  <div className="modal-body overflow-auto py-0 px-4">
                    {this.state.frame && (
                      <>
                        <p>{l10n.get('auth_domain_description', [this.state.frame.hostname])}</p>
                        <dl className="row d-flex align-items-center mb-0">
                          <dt className="col-4 mb-2">{l10n.map.watchlist_title_frame}</dt>
                          <dd className="col-8">{this.state.frame.urlPattern}</dd>
                          <dt className="col-4 mb-2">{l10n.map.auth_domain_api_label}</dt>
                          <dd className="col-8"><span className=" text-nowrap"><span className={`icon icon-marker text-${this.state.frame.api ? 'success' : 'danger'}`} aria-hidden="true"></span> {this.state.frame.api ? l10n.map.form_yes : l10n.map.form_no}</span></dd>
                        </dl>
                      </>
                    )}
                  </div>
                  <div className="modal-footer justify-content-center border-0 p-4 flex-shrink-0">
                    <div className="btn-bar">
                      <button type="button" onClick={this.handleCancel} className="btn btn-secondary">{l10n.map.form_cancel}</button>
                      <button type="button" onClick={this.handleConfirm} className="btn btn-primary">{l10n.map.form_confirm}</button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </SecurityBG>
    );
  }
}

AuthDomain.propTypes = {
  id: PropTypes.string,
};
