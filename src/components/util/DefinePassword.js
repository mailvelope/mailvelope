/**
 * Copyright (C) 2016-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../lib/l10n';
import React from 'react';
import PropTypes from 'prop-types';

l10n.register([
  'key_gen_pwd',
  'key_gen_pwd_empty',
  'key_gen_pwd_reenter',
  'key_gen_pwd_unequal',
  'key_gen_pwd_match'
]);

export default class DefinePassword extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      passwordCheck: '',
    };
    this.handleChange = this.handleChange.bind(this);
    this.retypeCheck = this.retypeCheck.bind(this);
  }

  componentDidMount() {
    if (this.props.focus) {
      this.pwdInput.focus();
    }
  }

  componentDidUpdate(prevProps) {
    if (this.props.value !== prevProps.value) {
      if (this.props.value === '') {
        this.setState({passwordCheck: ''}, () => this.props.onChange({target: {id: 'passwordCheck', error: false}}));
      } else {
        this.retypeCheck(this.state.passwordCheck);
      }
    }
  }

  handleChange(event) {
    const target = event.target;
    this.retypeCheck(target.value);
  }

  retypeCheck(value) {
    const error = this.props.value !== value && this.props.value.length;
    this.setState({passwordCheck: value}, () => this.props.onChange({target: {id: 'passwordCheck', error}}));
  }

  render() {
    return (
      <div>
        <div className="form-group">
          <label htmlFor="password" className={this.props.hideLabels ? 'sr-only' : ''}>{l10n.map.key_gen_pwd}</label>
          <input ref={pwdInput => this.pwdInput = pwdInput} value={this.props.value} onChange={this.props.onChange} onPaste={e => this.props.onChange({target: {type: 'password', id: 'password', value: e.clipboardData.getData('Text')}})} type="password" className={`form-control ${this.props.errors.password ? ' is-invalid' : ''} text-monospace`} id="password" disabled={this.props.disabled} placeholder={this.props.hideLabels ? l10n.map.key_gen_pwd : ''} />
          {this.props.errors.password && <div className="invalid-feedback">{this.props.errors.password.message !== '' ? this.props.errors.password.message : l10n.map.key_gen_pwd_empty}</div>}
        </div>
        <div className="form-group">
          <label htmlFor="passwordCheck" className={this.props.hideLabels ? 'sr-only' : ''}>{l10n.map.key_gen_pwd_reenter}</label>
          <input value={this.state.passwordCheck} onChange={this.handleChange} onPaste={e => this.props.onChange({target: {type: 'password', id: 'passwordCheck', value: e.clipboardData.getData('Text')}})} type="password" className={`form-control ${(this.props.errors.passwordCheck) ? 'is-invalid' : ''} text-monospace`} id="passwordCheck" disabled={this.props.disabled} placeholder={this.props.hideLabels ? l10n.map.key_gen_pwd_reenter : ''} />
          {this.props.errors.passwordCheck && <div className="invalid-feedback">{l10n.map.key_gen_pwd_unequal}</div>}
        </div>
      </div>
    );
  }
}

DefinePassword.propTypes = {
  value: PropTypes.string.isRequired,
  focus: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  errors: PropTypes.object,
  hideLabels: PropTypes.bool
};

DefinePassword.defaultProps = {
  focus: false,
  hideLabels: false
};

