/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../util/l10n';
import React from 'react';

'use strict';

const PrimaryKeyButton = props => {
  if (props.isPrimary) {
    return <button type="button" className="btn btn-warning" disabled="disabled">{l10n.map.keygrid_primary_label}</button>
  } else {
    return (
      <button type="button" className="btn btn-default" onClick={props.onClick}>
        <span className="glyphicon glyphicon-pushpin" aria-hidden="true"></span>&nbsp;
        <span>{l10n.map.key_set_as_primary}</span>
      </button>
    )
  }
};

PrimaryKeyButton.propTypes = {
  isPrimary: React.PropTypes.bool.isRequired,
  onClick: React.PropTypes.func.isRequired
}

export default PrimaryKeyButton;
