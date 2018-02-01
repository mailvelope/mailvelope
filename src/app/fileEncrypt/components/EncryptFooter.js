/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';

'use strict';

l10n.register([
  'options_home',
  'form_back',
  'editor_encrypt_button',
  'file_encrypt_armored_output'
]);

class EncryptFooter extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      expanded: false
    };
    this.handleOptionsClick = this.handleOptionsClick.bind(this);
  }

  renderOptions() {
    return (
      <form className="sign-msg-option well text-left" style={{marginTop: '20px', backgroundColor: 'white'}}>
        <div className="form-group">
          <div className="checkbox">
            <label className="checkbox" htmlFor="armoredOption">
              <input checked={this.props.armored} onChange={event => this.props.onChangeArmored(event.target.checked)} type="checkbox" id="armoredOption" />
              <span>{l10n.map.file_encrypt_armored_output}</span>
            </label>
          </div>
        </div>
      </form>
    );
  }

  handleOptionsClick() {
    this.setState(prevState => ({expanded: !prevState.expanded}));
  }

  render() {
    return (
      <div className={`text-right ${this.state.expanded ? 'encrypt-footer-expanded' : ''}`}>
        <button onClick={this.handleOptionsClick} className="btn btn-default btn-sm pull-left">
          <span>{l10n.map.options_home}</span>&nbsp;&nbsp;
          <span className={`glyphicon glyphicon-collapse-${this.state.expanded ? 'up' : 'down'}`} aria-hidden="true"></span>
        </button>
        <button onClick={this.props.onBack} className="btn btn-sm btn-default">{l10n.map.form_back}</button>
        <button onClick={this.props.onEncrypt} className="btn btn-sm btn-primary" disabled={this.props.encryptDisabled}>{l10n.map.editor_encrypt_button}</button>
        {this.state.expanded && this.renderOptions()}
      </div>
    );
  }
}

EncryptFooter.propTypes = {
  onBack: PropTypes.func, // click on back button
  onEncrypt: PropTypes.func, // click on encrypt button
  onChangeArmored: PropTypes.func, // change output format
  encryptDisabled: PropTypes.bool, // encrypt action disabled
  armored: PropTypes.bool, // output format, false: binary / true: ASCII-armored
};

export default EncryptFooter;
