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
      <li className={`nav-item ${match ? 'active' : ''}`} role="menuitem">
        <Link className="nav-link" to={to} replace tabIndex="0">{children}</Link>
      </li>
    )} />
  );
  /* eslint-enable react/no-children-prop */
}

NavLink.propTypes = {
  to: PropTypes.string,
  children: PropTypes.node
};

export function NavPill({to, children}) {
  /* eslint-disable react/no-children-prop */
  return (
    <Route path={to} children={({match}) => (
      <Link className={`nav-link ${match ? 'active' : ''}`} to={to} replace tabIndex="0">{children}</Link>
    )} />
  );
  /* eslint-enable react/no-children-prop */
}

NavPill.propTypes = {
  to: PropTypes.string,
  children: PropTypes.node
};

/**
 * Dates
 */
import {formatDate} from '../../lib/date';
/**
 * Call's `date-fns/format` with a locale from `navigator.language`
 *
 * This overloads `utils/date.js/formatDate`
 * @param {Date | number | string} date - a date to format
 * @param {string} formatStyle - a format string (eg 'DD.MM.YYY')
 * @param {Locale} locale - date-fns locale object
 * @returns {string} formatted string
 */
export function formatDateWithLocale(date, formatStyle) {
  return formatDate(date, formatStyle, navigator.language);
}
