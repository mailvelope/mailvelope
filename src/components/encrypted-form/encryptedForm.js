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

// register language strings
l10n.register([
  'alert_header_error'
]);

export default class EncryptedForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      waiting: true,
      submit: false,
      formAction: null,
      formRecipient: null,
      formDefinition: null,
    };
    this.formSandbox = null;
    this.port = mvelo.EventHandler.connect(`encryptedForm-${this.props.id}`, this);
    this.registerEventListeners();

    // emit event to backend that editor has initialized
    this.port.emit('encrypted-form-init');
  }

  componentDidMount() {
    if (this.props.secureBackground) {
      mvelo.util.showSecurityBackground(this.port, true);
    }
  }

  registerEventListeners() {
    this.port.on('encrypted-form-definition', this.showForm);
    this.port.on('error-message', this.showErrorMsg);
    this.port.on('terminate', () => mvelo.ui.terminate(this.port));
    this.port.on('encrypted-form-submit', this.onFormSubmit);
  }

  showForm(event) {
    this.setState({
      formAction: event.formAction,
      formRecipient: event.formRecipient,
      formDefinition: event.formDefinition,
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

  onClickSubmit() {
    this.setState(() => ({submit: true}));
  }

  onValidated(data) {
    this.port.emit('encrypted-form-submit', {data});
  }

  onFormSubmit(event) {
    const armoredDataInput = $('<input/>', {
      name: 'armoredData',
      value: event.armoredData,
      hidden: true
    });
    const form = $('<form/>', {
      action: this.state.formAction,
      method: 'post',
      target: '_parent'
    }).append(armoredDataInput);
    $('body').append(form);
    form.submit();
  }

  formSandboxIframe() {
    return (
      <FormSandbox formDefinition={this.state.formDefinition}
        onTerminate={() => mvelo.ui.terminate(this.port)}
        needSubmit={this.state.submit}
        onValidated={(data) => this.onValidated(data)}
        ref={node => this.formSandbox = node} />
    );
  }

  render() {
    return (
      <div className={this.props.secureBackground && !this.state.waiting ? 'jumbotron secureBackground' : ''} style={{height: '100%', position: 'relative'}}>
        <section className="well">
          {!this.state.waiting ? (this.formSandboxIframe()) : (<div>loading.. </div>)}
          <button className="btn btn-primary btn-big" type="submit" onClick={() => this.onClickSubmit()}>Submit</button>
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
