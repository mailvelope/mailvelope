/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import ReactDOM from 'react-dom';
import * as l10n from '../../lib/l10n';
// import Trans from '../util/Trans';
import './InstallLandingPage.scss';

l10n.register([
  'install_landing_page_hint',
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
    <main role="main" >
      <div id="help-text">{l10n.map.install_landing_page_hint}</div>
      <div className="d-flex d-flex justify-content-center">
        <div className="w-100"></div>
        <div className="jumbotron align-self-end mb-0 fle">
          <img src="../../img/mailvelope/logo.svg" width="336" alt="" />
        </div>
        <div id="arrow" className="w-100">
          <img src="../../img/mailvelope/corner-arrow.svg" width="100%" alt="" />
        </div>
      </div>
    </main>
  );
}
