/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../lib/l10n';
import EventHandler from '../../lib/EventHandler';
import SecurityBG from '../util/SecurityBG';
import DefinePassword from '../util/DefinePassword';
import Spinner from '../util/Spinner';
import Terminate from '../util/Terminate';

// register language strings
l10n.register([
  'keygen_dialog_password_error_length',
  'keygen_dialog_password_placeholder',
  'keygen_dialog_prolog',
  'keygen_waiting_description',
  'keygen_waiting_headline',
]);

const PWD_MIN_LENGTH = 4;

export default class GenKey extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      password: '',
      waiting: false,
      terminate: false,
      errors: {}
    };
    this.port = EventHandler.connect(`keyGenDialog-${this.props.id}`, this);
    this.registerEventListeners();
    this.port.emit('keygen-dialog-init');
    this.handleChange = this.handleChange.bind(this);
  }

  registerEventListeners() {
    this.port.on('check-dialog-inputs', () => this.port.emit('input-check', {isValid: this.validate(), pwd: this.state.password}));
    this.port.on('show-password', () => this.setState({waiting: false}));
    this.port.on('show-waiting', () => this.setState({waiting: true}));
    this.port.on('terminate', this.terminate);
  }

  terminate() {
    this.setState({terminate: true}, () => this.port.disconnect());
  }

  handleChange(event) {
    const target = event.target;
    this.setState(({errors: err}) => {
      const {[target.id]: deleted, ...errors} = err;
      if (target.error) {
        errors[target.id] = new Error();
      }
      return {[target.id]: target.value, errors, modified: true};
    });
    this.logUserInput('security_log_password_input');
  }

  validate() {
    const errors = {...this.state.errors};
    if (this.state.password.length < PWD_MIN_LENGTH) {
      errors.password = new Error(l10n.get('keygen_dialog_password_error_length', [PWD_MIN_LENGTH]));
    }
    if (Object.keys(errors).length) {
      this.setState({errors});
      return false;
    }
    return true;
  }

  logUserInput(type) {
    this.port.emit('keygen-user-input', {
      source: 'security_log_key_generator',
      type
    });
  }

  render() {
    return (
      <SecurityBG port={this.port}>
        <div className="modal d-block" style={{padding: '2rem'}}>
          <div className="modal-dialog d-flex align-items-center h-100 mw-100 m-0">
            <div className="modal-content shadow-lg border-0" style={{backgroundColor: 'rgba(255,255,255,1)'}}>
              <div className="modal-body d-flex flex-column overflow-auto p-4">
                {this.state.waiting ? (
                  <>
                    <Spinner style={{margin: '10px auto 20px auto'}} />
                    <h4 className="align-self-center text-center">{l10n.map.keygen_waiting_headline}</h4>
                    <p className="align-self-center text-center mb-0">{l10n.map.keygen_waiting_description}</p>
                  </>
                ) : (
                  <>
                    <h4 className="mb-4">{l10n.map.keygen_dialog_prolog}</h4>
                    <DefinePassword value={this.state.password} focus={true} errors={this.state.errors} onChange={this.handleChange} hideLabels={true} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        {this.state.terminate && <Terminate />}
      </SecurityBG>
    );
  }
}

GenKey.propTypes = {
  id: PropTypes.string,
};
