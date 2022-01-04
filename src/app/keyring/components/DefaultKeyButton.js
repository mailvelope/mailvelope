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
  'key_default_active_btn_title',
  'key_default_disabled_btn_title',
  'key_default_inactive_btn_title'
]);

export default function DefaultKeyButton(props) {
  return (
    <>
      {props.isDefault ? (
        <button type="button" className={`btn btn-info ${props.className || ''}`} disabled={true} title={l10n.map.key_default_active_btn_title}>{l10n.map.keygrid_default_label}</button>
      ) : (
        props.disabled ? (
          <button type="button" className={`btn btn-secondary ${props.className || ''}`} disabled={true} title={l10n.map.key_default_disabled_btn_title}>
            {l10n.map.key_set_as_default}
          </button>
        ) : (
          <button type="button" className={`btn btn-info ${props.className || ''}`} onClick={props.onClick} title={l10n.map.key_default_inactive_btn_title}>
            {l10n.map.key_set_as_default}
          </button>
        )
      )}
    </>
  );
}

DefaultKeyButton.propTypes = {
  className: PropTypes.string,
  isDefault: PropTypes.bool.isRequired,
  onClick: PropTypes.func,
  disabled: PropTypes.bool
};
