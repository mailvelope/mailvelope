/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import ReactDOM from 'react-dom';
import Trans, * as l10n from '../../lib/l10n';
import './InstallLandingPage.less';

l10n.register([
  'install_landing_page_getting_started',
  'install_landing_page_help',
  'install_landing_page_help_wrapper',
  'install_landing_page_welcome',
  'encrypt_error'
]);
l10n.mapToLocal();

document.addEventListener('DOMContentLoaded', init);

function init() {
  const root = document.createElement('div');
  ReactDOM.render((
    <InstallLandingPage />
  ), document.body.appendChild(root));
}

function InstallLandingPage() {
  return (
    <div className="container">
      <nav className="navbar navbar-default navbar-fixed-top">
        <div className="container">
          <div className="navbar-header">
            <div className="navbar-brand settings-logo">Mailvelope</div>
          </div>
        </div>
      </nav>
      <div className="landing-page">
        <div className="col-md-10">
          <h1 className="settings-logo">{l10n.map.install_landing_page_welcome}</h1>
          <p><Trans id={l10n.map.install_landing_page_getting_started} components={[<span key="0"><img src="../../img/cryptography-icon48.png" height="25px"/></span>]} /></p>
          <p><Trans id={l10n.map.install_landing_page_help} components={[<a key="0" href="https://www.mailvelope.com/help" rel="noreferrer noopener"></a>]} /></p>
        </div>
        <div className="col-md-2">
          <div className="illustration"><i className="fa fa-arrow-up" aria-hidden="true"></i></div>
        </div>
      </div>
    </div>
  );
}
