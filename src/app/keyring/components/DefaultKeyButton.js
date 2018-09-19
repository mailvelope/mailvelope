/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import React from 'react';
import PropTypes from 'prop-types';

l10n.register([
  'keygrid_default_label',
  'key_set_as_default',
  'invalid_default_key'
]);

export default class DefaultKeyButton extends React.Component {
  componentDidMount() {
    this.initTooltip();
  }

  componentDidUpdate() {
    this.initTooltip();
  }

  initTooltip() {
    if (this.props.disabled) {
      $(this.defaultButton).tooltip();
    }
  }

  render() {
    if (this.props.isDefault) {
      return <button type="button" className="btn btn-warning" disabled={true}>{l10n.map.keygrid_default_label}</button>;
    } else {
      const buttonText = (
        <div>
          <span className="glyphicon glyphicon-pushpin" aria-hidden="true"></span>&nbsp;
          <span>{l10n.map.key_set_as_default}</span>
        </div>
      );
      if (this.props.disabled) {
        return (
          <div ref={node => this.defaultButton = node} data-toggle="tooltip" data-placement="top" title={l10n.map.invalid_default_key}>
            <button type="button" className="btn btn-default disabled">
              {buttonText}
            </button>
          </div>
        );
      }
      return (
        <button type="button" className="btn btn-default" onClick={this.props.onClick}>
          {buttonText}
        </button>
      );
    }
  }
}

DefaultKeyButton.propTypes = {
  isDefault: PropTypes.bool.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool
};
