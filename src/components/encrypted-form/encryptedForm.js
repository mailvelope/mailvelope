/**
 * Copyright (C) 2012-2018 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import mvelo from '../../mvelo';
import * as l10n from '../../lib/l10n';

import './encryptedForm.css';

// register language strings
l10n.register([
  'alert_header_error'
]);

export default class EncryptedForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      message: 'ok',
      formDefinition: null,
      error: null
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
  }

  registerEventListeners() {
    this.port.on('encrypted-form-ready', this.showReadyMsg);
    this.port.on('encrypted-form-definition-ok', this.showForm);
    this.port.on('error-message', this.showErrorMsg);
    this.port.on('terminate', () => mvelo.ui.terminate(this.port));
  }

  showReadyMsg() {
    this.setState({
      message: 'encrypted-form-ready',
      waiting: false
    });
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

  render() {
    let formContent;
    if (this.state.formDefinition) {
      formContent = <div dangerouslySetInnerHTML={{__html: this.state.formDefinition}} />;
    }

    return (
      <div className={this.props.secureBackground && !this.state.waiting ? 'jumbotron secureBackground' : ''} style={{height: '100%', position: 'relative'}}>
        <section className="well">
          {formContent}
          <button className="btn btn-primary" type="submit">Submit</button>
        </section>
      </div>
    );
  }
}

EncryptedForm.propTypes = {
  id: PropTypes.string,
  secureBackground: PropTypes.bool,
  isContainer: PropTypes.bool
};

EncryptedForm.defaultProps = {
  secureBackground: true
};
