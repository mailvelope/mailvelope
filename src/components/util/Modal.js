/**
 * Copyright (C) 2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../lib/l10n';
import React from 'react';
import {Button, Modal as ModalRS, ModalHeader as ModalHeaderRS, ModalBody as ModalBodyRS, ModalFooter as ModalFooterRS} from 'reactstrap';
import PropTypes from 'prop-types';

l10n.register([
  'form_ok',
  'form_cancel'
]);

export default function Modal(props) {
  return (
    <ModalRS toggle={typeof props.toggle === 'function' ? props.toggle : undefined} isOpen={props.isOpen} onOpened={props.onShow} onClosed={props.onHide} fade={props.animate} className={props.className} size={props.size === 'small' ? 'sm' : props.size === 'large' ? 'lg' : 'md'} keyboard={props.keyboard}>
      {!props.hideHeader &&
        (
          props.header ||
          <ModalHeaderRS toggle={typeof props.toggle === 'function' ? props.toggle : undefined} className={props.headerClass}>{props.title}</ModalHeaderRS>
        )
      }
      <ModalBodyRS>
        {props.children}
      </ModalBodyRS>
      {!props.hideFooter &&
        (
          props.footer ||
          <ModalFooterRS>
            {props.toggle && <Button color="secondary" onClick={props.toggle}>{l10n.map.form_cancel}</Button>}
            <Button color="primary" onClick={props.onOk}>{l10n.map.form_ok}</Button>
          </ModalFooterRS>
        )
      }
    </ModalRS>
  );
}

Modal.propTypes = {
  className: PropTypes.string,
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  title: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.element
  ]),
  header: PropTypes.element,
  headerClass: PropTypes.string,
  footer: PropTypes.element,
  children: PropTypes.node,
  onHide: PropTypes.func,
  onShow: PropTypes.func,
  onOk: PropTypes.func,
  toggle: PropTypes.func,
  hideHeader: PropTypes.bool,
  hideFooter: PropTypes.bool,
  keyboard: PropTypes.bool,
  animate: PropTypes.bool,
  isOpen: PropTypes.bool
};

Modal.defaultProps = {
  size: 'medium',
  keyboard: true,
  animate: true,
  headerClass: '',
  isOpen: false
};

