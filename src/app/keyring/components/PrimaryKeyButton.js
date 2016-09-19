
/* global app */

'use strict';

const PrimaryKeyButton = props => { // eslint-disable-line no-unused-vars
  if (props.isPrimary) {
    return <button type="button" className="btn btn-warning" disabled="disabled">{app.l10n.keygrid_primary_label}</button>
  } else {
    return (
      <button type="button" className="btn btn-default" onClick={props.onClick}>
        <span className="glyphicon glyphicon-pushpin" aria-hidden="true"></span>&nbsp;
        <span>{app.l10n.key_set_as_primary}</span>
      </button>
    )
  }
};
