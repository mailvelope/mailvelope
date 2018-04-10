/**
 * Copyright (C) 2012-2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import mvelo from '../../mvelo';
import * as l10n from '../../lib/l10n';
import FormSandbox from './components/FormSandbox';
import './encryptedForm.css';
import Spinner from "../util/Spinner";

// register language strings
l10n.register([
  'alert_header_error',
  'form_submit',
  'form_destination',
  'form_recipient',
  'form_destination_default'
]);

export default class EncryptedForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      waiting: true,
      submit: false,
      formAction: null,
      formDefinition: null,
      formEncoding: null,
      formRecipient: null,
      formFingerprint: null
    };
    this.port = mvelo.EventHandler.connect(`encryptedForm-${this.props.id}`, this);
    this.registerEventListeners();

    // emit event to backend that editor has initialized
    this.port.emit('encrypted-form-init');
  }

  componentDidMount() {
    if (this.props.secureBackground) {
      mvelo.util.showSecurityBackground(this.port, true);
    }
    this.onResize();
  }

  registerEventListeners() {
    this.port.on('encrypted-form-definition', this.showForm);
    this.port.on('error-message', this.showErrorMsg);
    this.port.on('terminate', () => mvelo.ui.terminate(this.port));
    this.port.on('encrypted-form-submit', this.onFormSubmit);
  }

  showForm(event) {
    this.setState({
      formEncoding: event.formEncoding,
      formDefinition: event.formDefinition,
      formAction: event.formAction,
      formRecipient: event.formRecipient,
      formFingerprint: event.formFingerprint,
      waiting: false
    });
  }

  showErrorMsg({error}) {
    this.setState({
      error: {
        header: l10n.map.alert_header_error,
        message: error,
        type: 'danger'
      },
      waiting: false
    });
  }

  handleClickSubmit() {
    this.setState(() => ({submit: true}));
  }

  onValidated(data) {
    // when the data is validated, all green, we can encrypt and submit
    this.port.emit('encrypted-form-submit', {data});
  }

  onFormSandboxError(error) {
    this.port.emit('encrypted-form-error', {message: error.message});
  }

  onFormSubmit(event) {
    const armoredDataInput = $('<textarea/>', {
      name: 'armoredData',
      hidden: true
    });
    armoredDataInput.text(event.armoredData);
    const form = $('<form/>', {
      action: this.state.formAction,
      method: 'post',
      target: '_parent'
    }).append(armoredDataInput);
    $('body').append(form);
    form.submit();
  }

  onResize() {
    this.port.emit('encrypted-form-resize', {height: document.body.scrollHeight});
  }

  formSandbox() {
    return (
      <FormSandbox formDefinition={this.state.formDefinition}
        formEncoding={this.state.formEncoding}
        needSubmit={this.state.submit}
        onValidated={data => this.onValidated(data)}
        onError={error => this.onFormSandboxError(error)}
        onResize={() => this.onResize()} />
    );
  }

  render() {
    return (
      <div className={this.props.secureBackground && !this.state.waiting ? 'jumbotron secureBackground' : ''} style={{height: '100%', position: 'relative'}}>
        <section className="well clearfix">
          {this.state.waiting  ? (<Spinner style={{margin: '0 auto 0'}} />) : (
            <div>
              {this.formSandbox()}
              <button className="btn btn-primary" type="button" onClick={() => this.handleClickSubmit()}>{l10n.map.form_submit}</button>
              <div className="recipient">
                <div className="recipient-action">{l10n.map.form_destination}: {this.state.formAction ? this.state.formAction : l10n.map.form_destination_default}</div>
                <div className="recipient-email">{l10n.map.form_recipient}: {this.state.formRecipient}</div>
                <div className="recipient-fingerprint">{this.state.formFingerprint}</div>
              </div>
            </div>
          )}
        </section>
      </div>
    );
  }
}

EncryptedForm.propTypes = {
  id: PropTypes.string,
  secureBackground: PropTypes.bool
};

EncryptedForm.defaultProps = {
  secureBackground: true,
};
