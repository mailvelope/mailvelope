/**
 * Copyright (C) 2025 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import PropTypes from 'prop-types';
import {Link} from 'react-router-dom';
import {Collapse} from 'reactstrap';
import * as l10n from '../lib/l10n';
import {NavLink} from './util/util';

l10n.register([
  'decrypt_home',
  'encrypt_home',
  'feature_banner_new_security_background_btn',
  'feature_banner_new_security_background_text',
  'keyring_header',
  'options_docu',
  'options_home'
]);

/**
 * Navigation component
 * @param {boolean} showLinks - If true, shows full navigation links. If false, shows only logo + help
 * @param {object} prefs - User preferences for feature banner
 * @param {object} location - Current location for feature banner logic
 * @param {boolean} collapse - Collapse state for mobile menu
 * @param {function} toggleNavbar - Function to toggle mobile menu
 */
export default function Navigation({showLinks = true, prefs, location, collapse, toggleNavbar}) {
  return (
    <nav className="navbar flex-column fixed-top navbar-expand-md navbar-light bg-white">
      <div className="container-lg py-2">
        <Link to="/dashboard" className="navbar-brand">
          <img src="../img/Mailvelope/logo.svg" width="175" height="32" className="d-inline-block align-top" alt="" />
        </Link>

        {showLinks ? (
          <>
            <button
              className="navbar-toggler"
              type="button"
              onClick={toggleNavbar}
              aria-controls="navbarSupportedContent"
              aria-expanded={collapse}
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>
            <Collapse isOpen={collapse} className="navbar-collapse">
              <ul className="navbar-nav mr-auto">
                <NavLink to="/keyring">{l10n.map.keyring_header}</NavLink>
                <NavLink to="/encrypt">{l10n.map.encrypt_home}</NavLink>
                <NavLink to="/decrypt">{l10n.map.decrypt_home}</NavLink>
                <NavLink to="/settings">{l10n.map.options_home}</NavLink>
              </ul>
              <ul className="navbar-nav">
                <li className="nav-item">
                  <a className="nav-link" href="https://www.mailvelope.com/faq" target="_blank" rel="noreferrer noopener" tabIndex="0">
                    <span className="icon icon-help d-none d-md-inline" aria-hidden="true"></span>
                    <span className="d-md-none">{l10n.map.options_docu}</span>
                  </a>
                </li>
              </ul>
            </Collapse>
          </>
        ) : (
          <ul className="navbar-nav">
            <li className="nav-item">
              <a className="nav-link" href="https://www.mailvelope.com/faq" target="_blank" rel="noreferrer noopener" tabIndex="0">
                <span className="icon icon-help d-none d-md-inline" aria-hidden="true"></span>
                <span className="d-md-none">{l10n.map.options_docu}</span>
              </a>
            </li>
          </ul>
        )}
      </div>
      {(showLinks && prefs && !prefs.security.personalized && location && location.pathname !== '/settings/security-background') && (
        <div className="feature-banner d-flex align-items-center justify-content-center align-self-stretch p-3">
          <span className="mr-3">{l10n.map.feature_banner_new_security_background_text}</span>
          <Link to="/settings/security-background" className="btn btn-sm btn-primary">
            {l10n.map.feature_banner_new_security_background_btn}
          </Link>
        </div>
      )}
    </nav>
  );
}

Navigation.propTypes = {
  showLinks: PropTypes.bool,
  prefs: PropTypes.object,
  location: PropTypes.object,
  collapse: PropTypes.bool,
  toggleNavbar: PropTypes.func
};
