/**
 * Copyright (C) 2016-2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';


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
