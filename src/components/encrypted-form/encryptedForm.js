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
import Alert from "../util/Alert";

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
      validate: false,
      validated: false,
      formAction: null,
      formDefinition: null,
      formEncoding: null,
      formRecipient: null,
      formFingerprint: null
    };
    this.port = mvelo.EventHandler.connect(`encryptedForm-${this.props.id}`, this);
    this.registerEventListeners();

    // emit event to backend that form has initialized
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
    this.port.on('encrypted-form-submit-cancel', this.onFormSubmitCancel);
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

  showErrorMsg(error) {
    this.setState({
      error: {
        header: l10n.map.alert_header_error,
        message: error.message,
        type: 'danger'
      },
      waiting: false
    });
  }

  onClickSubmit() {
    // Set state to submit
    // This will cover the form with a spinner and trigger validation in FormSandbox
    // and a possible onValidatedCall callback
    this.setState({validated: false, validate: true});
  }

  onValidated(data) {
    // when the data is validated, tell controller to encrypt and submit
    this.setState({validate: false, validated: true});
    this.port.emit('encrypted-form-submit', {data});
  }

  onFormSubmitCancel() {
    this.setState({validated: false, validate: false});
  }

  onFormSandboxError(error) {
    this.port.emit('encrypted-form-error', mvelo.util.mapError(error));
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
    // do not resize less than 100px, e.g. the minimal / original size of the iframe
    if (document.body.scrollHeight > 100) {
      this.port.emit('encrypted-form-resize', {height: document.body.scrollHeight});
    }
  }

  formSandbox() {
    return (
      <FormSandbox formDefinition={this.state.formDefinition}
        formEncoding={this.state.formEncoding}
        validate={this.state.validate}
        onValidated={data => this.onValidated(data)}
        onError={error => this.onFormSandboxError(error)}
        onResize={() => this.onResize()}
        onTerminate={() => mvelo.ui.terminate(this.port)} />
    );
  }

  render() {
    let submitSpinner = '';
    if (this.state.validated) {
      submitSpinner = <div className="spinnerWrapper"><Spinner style={{margin: '0 auto 0'}} /></div>;
    }
    return (
      <div className={this.props.secureBackground && !this.state.waiting ? 'jumbotron secureBackground' : ''} style={{height: '100%', position: 'relative'}}>
        <section className="well clearfix">
          {this.state.waiting  ? (<Spinner style={{margin: '0 auto 0'}} />) : (
            <div>
              {this.state.error ? (<Alert message={this.state.error.message} type={this.state.error.type} />) : (
                <div>
                  {submitSpinner}
                  <div className="formWrapper">
                    {this.formSandbox()}
                    <button className="btn btn-primary" type="button" onClick={() => this.onClickSubmit()}>{l10n.map.form_submit}</button>
                    <div className="recipient">
                      <div className="recipient-action">{l10n.map.form_destination}: {this.state.formAction ? this.state.formAction : l10n.map.form_destination_default}</div>
                      <div className="recipient-email">{l10n.map.form_recipient}: {this.state.formRecipient}</div>
                      <div className="recipient-fingerprint">{this.state.formFingerprint.match(/.{1,4}/g).join(' ')}</div>
                    </div>
                  </div>
                </div>
              )}
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
  secureBackground: true
};
