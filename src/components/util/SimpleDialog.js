/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../lib/l10n';
import React from 'react';
import Modal from './Modal';
import PropTypes from 'prop-types';

l10n.register([
  'dialog_no_btn',
  'dialog_yes_btn',
]);

export default function SimpleDialog(props) {
  return (
    <Modal isOpen={props.isOpen} toggle={props.toggle} size={props.size} title={props.title} hideFooter={true} onHide={props.onHide}>
      <div>
        {props.message && <p>{props.message}</p>}
        {props.children}
        <div className="row btn-bar">
          <div className="col-6">
            <button type="button" className="btn btn-secondary btn-block" onClick={props.onCancel}>{l10n.map.dialog_no_btn}</button>
          </div>
          <div className="col-6">
            <button type="button" onClick={props.onOk} className="btn btn-primary btn-block">{l10n.map.dialog_yes_btn}</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

SimpleDialog.propTypes = {
  children: PropTypes.node,
  isOpen: PropTypes.bool,
  message: PropTypes.string,
  onCancel: PropTypes.func,
  onHide: PropTypes.func,
  onOk: PropTypes.func,
  title: PropTypes.string,
  toggle: PropTypes.func,
  size: PropTypes.oneOf(['small', 'medium', 'large'])
};

SimpleDialog.defaultProps = {
  size: 'small',
};
