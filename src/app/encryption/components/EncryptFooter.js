/**
 * Copyright (C) 2017-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import * as l10n from '../../../lib/l10n';

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
      <form className="sign-msg-option card text-left bg-white mt-3">
        <div className="card-body">
          <div className="custom-control custom-checkbox">
            <input className="custom-control-input" type="checkbox" id="armoredOption" onChange={event => this.props.onChangeArmored(event.target.checked)} checked={this.props.armored} />
            <label className="custom-control-label" htmlFor="armoredOption">{l10n.map.file_encrypt_armored_output}</label>
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
      <>
        <div className="d-flex">
          <button type="button" onClick={this.handleOptionsClick} className="btn btn-secondary btn-sm mr-auto">
            <i className={`icon icon-arrow-${this.state.expanded ? 'down' : 'up'}`} aria-hidden="true"></i> {l10n.map.options_home}
          </button>
          <button type="button" onClick={this.props.onBack} className="btn btn-sm btn-secondary mr-1">{l10n.map.form_back}</button>
          <button type="button" onClick={this.props.onEncrypt} className="btn btn-sm btn-primary" disabled={this.props.encryptDisabled}>{l10n.map.editor_encrypt_button}</button>
        </div>
        {this.state.expanded && this.renderOptions()}
      </>
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
