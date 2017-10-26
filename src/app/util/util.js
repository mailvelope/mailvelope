/**
 * Copyright (C) 2016-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * Alert
 */
export function Alert({header, message, type}) {
  return (
    <div className={`alert fade in alert-${type}`}>
      {header && <strong>{`${header} `}</strong>}
      <span>{message}</span>
    </div>
  );
}

Alert.propTypes = {
  header: PropTypes.string,
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'info', 'warning', 'danger'])
};


/**
 * NavLink
 */
import {Route, Link} from 'react-router-dom';

export function NavLink({to, children}) {
  /* eslint-disable react/no-children-prop */
  return (
    <Route path={to} children={({match}) => (
      <li className={match ? 'active' : ''} role="menuitem">
        <Link to={to} replace tabIndex="0">{children}</Link>
      </li>
    )} />
  );
  /* eslint-enable react/no-children-prop */
}

NavLink.propTypes = {
  to: PropTypes.string,
  children: PropTypes.node
};


/**
 * ProviderLogo
 */

export function ProviderLogo({logo}) {
  let style;
  if (logo) {
    style = {
      backgroundImage: `url(${logo})`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right top'
    };
  } else {
    style = {
      backgroundImage: 'none'
    };
  }
  return <div className="third-party-logo" style={style}></div>;
}

ProviderLogo.propTypes = {
  logo: PropTypes.string
};
