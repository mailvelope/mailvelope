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
import {format} from 'date-fns';
import * as locales from 'date-fns/locale'; // we are ok with importing all languages
/**
 * Call's `date-fns/format` with a locale from `navigator.language`
 *
 * @param {Date | number | string} date - a date to format
 * @param {string?} formatStyle - a format string (eg 'DD.MM.YYY'), default is 'P'
 * @param {import('date-fns').Locale} locale - date-fns locale object
 * @returns {string} formatted string
 */
export function formatDateWithLocale(date, formatStyle) {
  return format(date, formatStyle || 'P', {locale: getDefaultLocale()});
}

/**
 * Gets locale from navigator.language setting
 * @returns {import('date-fns').Locale} - locale from navigator.language setting
 */
export function getDefaultLocale() {
  return locales[navigator.language.replace('-', '')];
}
