/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import * as l10n from '../../../lib/l10n';

'use strict';

l10n.register([
  'form_cancel',
  'editor_sign_button',
  'editor_encrypt_button'
]);

class EditorModalFooter extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div>
        <button onClick={this.props.onCancel} className="btn btn-default">
          <span className="glyphicon glyphicon-remove" aria-hidden="true"></span>&nbsp;
          <span>{l10n.map.form_cancel}</span>
        </button>
        <button onClick={this.props.onSignOnly} className="btn btn-default">
          <span className="glyphicon glyphicon-pencil" aria-hidden="true"></span>&nbsp;
          <span>{l10n.map.editor_sign_button}</span>
        </button>
        <button onClick={this.props.onEncrypt} className="btn btn-primary" disabled={this.props.encryptDisabled}>
          <span className="glyphicon glyphicon-lock" aria-hidden="true"></span>&nbsp;
          <span>{l10n.map.editor_encrypt_button}</span>
        </button>
      </div>
    );
  }
}

EditorModalFooter.propTypes = {
  onCancel: React.PropTypes.func, // click on cancel button
  onSignOnly: React.PropTypes.func, // click on sign only button
  onEncrypt: React.PropTypes.func, // click on encrypt button
  encryptDisabled: React.PropTypes.bool // encrypt action disabled
}

export default EditorModalFooter;
