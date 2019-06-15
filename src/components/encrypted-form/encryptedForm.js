/**
 * Copyright (C) 2012-2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import $ from 'jquery';
import * as l10n from '../../lib/l10n';
import {mapError, formatFpr} from '../../lib/util';
import EventHandler from '../../lib/EventHandler';
import FormSandbox from './components/FormSandbox';
import './encryptedForm.css';
import SecurityBG from '../util/SecurityBG';
import Spinner from '../util/Spinner';
import Alert from '../util/Alert';
import Modal from '../util/Modal';
import Terminate from '../util/Terminate';

// register language strings
l10n.register([
  'alert_header_error',
  'form_destination',
  'form_destination_default',
  'form_loading',
  'form_recipient',
  'form_submit'
]);

export default class EncryptedForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      waiting: true,
      showWaiting: true,
      validate: false,
      validated: false,
      formAction: null,
      formDefinition: null,
      formEncoding: null,
      formRecipient: null,
      recipientFpr: null,
      terminate: false
    };
    this.port = EventHandler.connect(`encryptedForm-${this.props.id}`, this);
    this.registerEventListeners();

    // emit event to backend that form has initialized
    this.port.emit('encrypted-form-init');
  }

  componentDidMount() {
    this.onResize();
  }

  registerEventListeners() {
    this.port.on('encrypted-form-definition', this.showForm);
    this.port.on('error-message', this.showErrorMsg);
    this.port.on('terminate', () => this.onTerminate);
    this.port.on('encrypted-form-submit', this.onFormSubmit);
    this.port.on('encrypted-form-submit-cancel', this.onFormSubmitCancel);
  }

  onTerminate() {
    this.setState({terminate: true}, () => this.port.disconnect());
  }

  showForm(event) {
    this.setState({...event, showWaiting: false});
  }

  showErrorMsg(error) {
    this.setState({
      error: {
        header: l10n.map.alert_header_error,
        message: error.message,
        type: 'danger'
      },
      showWaiting: false
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
    this.port.emit('encrypted-form-error', mapError(error));
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
        onResize={() => this.onResize()} />
    );
  }

  render() {
    if (this.state.waiting) {
      return (
        <Modal isOpen={this.state.showWaiting} className="waiting-modal" hideHeader={true} hideFooter={true} keyboard={false} onHide={() => this.setState({waiting: false})}>
          <div>
            <Spinner style={{margin: '10px auto'}} />
            <p className="text-center mb-0">{l10n.map.form_loading}&hellip;</p>
          </div>
        </Modal>
      );
    }
    return (
      <SecurityBG className="jumbotron" port={this.port} style={{height: '100%', position: 'relative'}}>
        <div className="card">
          <div className="card-body">
            {this.state.error ? (<Alert type={this.state.error.type}>{this.state.error.message}</Alert>) : (
              <div>
                {this.state.validated && <div className="spinnerWrapper"><Spinner style={{margin: '0 auto 0'}} /></div>}
                <div className="formWrapper">
                  {this.formSandbox()}
                  <button className="btn btn-primary" type="button" onClick={() => this.onClickSubmit()}>{l10n.map.form_submit}</button>
                  <div className="recipient">
                    <div className="recipient-action">{l10n.map.form_destination}: {this.state.formAction ? this.state.formAction : l10n.map.form_destination_default}</div>
                    <div className="recipient-email">{l10n.map.form_recipient}: {this.state.formRecipient}</div>
                    <div className="recipient-fingerprint">{formatFpr(this.state.recipientFpr)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {this.state.terminate && <Terminate />}
      </SecurityBG>
    );
  }
}

EncryptedForm.propTypes = {
  id: PropTypes.string,
};
