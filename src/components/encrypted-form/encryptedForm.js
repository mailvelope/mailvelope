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
      formDefinition: null,
      error: null,
      waiting: true,
      submit: false
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
  }

  showForm(event) {
    this.setState({
      formDefinition: event.html,
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

  onSubmit() {
    this.setState(() => ({submit: true}));
  }

  formSandboxIframe() {
    return (
      <FormSandbox formDefinition={this.state.formDefinition}
        onTerminate={() => mvelo.ui.terminate(this.port)}
        needSubmit={this.state.submit}
        ref={node => this.formSandbox = node} />
    );
  }

  render() {
    return (
      <div className={this.props.secureBackground && !this.state.waiting ? 'jumbotron secureBackground' : ''} style={{height: '100%', position: 'relative'}}>
        <section className="well">
          {!this.state.waiting ? (this.formSandboxIframe()) : (<div>loading.. </div>)}
          <button className="btn btn-primary btn-big" type="submit" onClick={() => this.onSubmit()}>Submit</button>
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
