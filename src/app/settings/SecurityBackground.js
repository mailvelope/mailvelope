/**
 * Copyright (C) 2012-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {port} from '../app';
import * as l10n from '../../lib/l10n';

import common from '../../res/common.json';
import './SecurityBackground.scss';

l10n.register([
  'settings_security_background',
  'security_background_text',
  'security_background_icons_text',
  'security_background_color_text',
  'form_save',
  'form_cancel'
]);

export default class SecurityBackground extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      bgIcon: '',
      bgColor: '',
      modified: false
    };
    this.handleSave = this.handleSave.bind(this);
    this.handleCancel = this.handleCancel.bind(this);
  }

  componentDidMount() {
    this.loadPrefs();
  }

  async loadPrefs() {
    const prefs = await port.send('get-prefs');
    this.setState({
      bgIcon: prefs.security.bgIcon,
      bgColor: prefs.security.bgColor
    });
  }

  handleClickBgIcon(icon) {
    if (this.state.bgIcon !== icon) {
      this.setState({bgIcon: icon, modified: true});
    }
  }

  handleClickColorIcon(color) {
    if (this.state.bgColor !== color) {
      this.setState({bgColor: color, modified: true});
    }
  }

  async handleSave() {
    const update = {
      security: {
        bgIcon: this.state.bgIcon,
        bgColor: this.state.bgColor,
        personalized: true
      }
    };
    await this.props.onChangePrefs(update);
    port.emit('security-background-update');
    this.setState({modified: false});
  }

  handleCancel() {
    this.loadPrefs();
    this.setState({modified: false});
  }

  render() {
    return (
      <div id="securityBackground">
        <h2 className="mb-4">{l10n.map.settings_security_background}</h2>
        <form className="form">
          <div className="form-group mb-4" id="securityTokenPanel">
            <p>{l10n.map.security_background_text}</p>
            <p className="lead">
              <b>{l10n.map.security_background_icons_text}</b>
            </p>
            <div className="mb-4">
              <div id="securityBgContainer" className="d-flex flex-wrap">
                {Object.keys(common.securityBGs).map(index =>
                  <a key={index} className={`securityBgLink ${this.state.bgIcon === index ? 'active' : ''}`} tabIndex="0" onClick={() => this.handleClickBgIcon(index)}>
                    <div className={`securityBgItem symbol ${common.securityBGs[index]}`}>
                    </div>
                  </a>
                )}
              </div>
            </div>
            <p className="lead">
              <b>{l10n.map.security_background_color_text}</b>
            </p>
            <div>
              <div id="securityBgContainer" className="d-flex flex-wrap">
                {Object.keys(common.securityColors).map(index =>
                  <a key={index} className={`securityBgLink ${this.state.bgColor === index ? 'active' : ''}`} tabIndex="0" onClick={() => this.handleClickColorIcon(index)}>
                    <div className={`securityBgItem color ${index}`}>
                    </div>
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="btn-bar">
            <button type="button" id="secBtnSave" onClick={this.handleSave} className="btn btn-primary" disabled={!this.state.modified}>{l10n.map.form_save}</button>
            <button type="button" id="secBtnCancel" onClick={this.handleCancel} className="btn btn-secondary" disabled={!this.state.modified}>{l10n.map.form_cancel}</button>
          </div>
        </form>
      </div>
    );
  }
}

SecurityBackground.propTypes = {
  onChangePrefs: PropTypes.func.isRequired
};
