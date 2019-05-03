/**
 * Copyright (C) 2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {Toast as ToastRS, ToastHeader as ToastHeaderRS, ToastBody as ToastBodyRS, Fade as FadeRS} from 'reactstrap';

/**
 * Alert
 */
export default function Toast({className, isOpen, transition, toggle, header, type, children: message}) {
  return (
    <ToastRS className={`${className || ''} ${type || ''}`} isOpen={isOpen} transition={transition}>
      {header &&
        <ToastHeaderRS toggle={toggle} icon={type && <span aria-hidden="true" className={`icon-svg icon-svg-${type === 'success' ? 'positive' : 'negative'} flex-shrink-0`}></span>}>
          {header}
        </ToastHeaderRS>
      }
      <ToastBodyRS className={`d-flex align-items-center ${toggle && !header ? 'dismissable' : ''}`}>
        {toggle && !header && (type && <span aria-hidden="true" className={`icon-svg icon-svg-${type === 'success' ? 'positive' : 'negative'} flex-shrink-0`}></span>)}
        {message} {toggle && !header && (
          <button type="button" onClick={toggle} className="close ml-auto" aria-label="Close">
            <span aria-hidden="true" className="icon icon-close flex-shrink-0 ml-3"></span>
          </button>
        )}
      </ToastBodyRS>
    </ToastRS>
  );
}

Toast.propTypes = {
  className: PropTypes.string,
  isOpen: PropTypes.bool,
  transition: PropTypes.shape(FadeRS.propTypes),
  toggle: PropTypes.func,
  header: PropTypes.string,
  type: PropTypes.oneOf(['success', 'error']),
  children: PropTypes.node.isRequired,
};

Toast.defaultProps = {
  isOpen: true
};
