/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import ReactDOM from 'react-dom';
import * as l10n from '../../lib/l10n';
import Trans from '../util/Trans';
import './InstallLandingPage.css';

l10n.register([
  'install_landing_page_getting_started',
  'install_landing_page_help',
  'install_landing_page_welcome',
  'options_docu',
  'options_about'
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
    <>
      <nav className="navbar fixed-top navbar-expand-md navbar-light bg-white py-3">
        <div className="container">
          <div className="navbar-brand">
            <img src="../../img/logo.svg" width="175" height="32" className="d-inline-block align-top" alt="" />
          </div>
          <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarSupportedContent">
            <ul className="navbar-nav ml-auto">
              <li className="nav-item"><a className="nav-link" href="https://www.mailvelope.com/help" target="_blank" rel="noreferrer noopener" tabIndex="0">{l10n.map.options_docu}</a></li>
              <li className="nav-item"><a className="nav-link" href="https://www.mailvelope.com/about" target="_blank" rel="noreferrer noopener" tabIndex="0">{l10n.map.options_about}</a></li>
            </ul>
          </div>
        </div>
      </nav>
      <main className="container landing-page" role="main">
        <section className="jumbotron secureBackground">
          <div className="row">
            <div className="col-md-10">
              <h1 className="card-title">{l10n.map.install_landing_page_welcome}</h1>
              <p><Trans id={l10n.map.install_landing_page_getting_started} components={[<span key="0"><img src="../../img/logo_signet_32.png" height="32px" /></span>]} /></p>
              <p><Trans id={l10n.map.install_landing_page_help} components={[<a key="0" href="https://www.mailvelope.com/help" rel="noreferrer noopener"></a>]} /></p>
            </div>
            <div className="col-md-2">
              <div className="illustration"><i className="fa fa-arrow-up" aria-hidden="true"></i></div>
            </div>
          </div>
        </section>
      </main>
      <footer className="container">
        <div className="d-flex justify-content-between">
          <p className="mb-0">&copy; 2012-2019 Mailvelope GmbH</p>
        </div>
      </footer>
    </>
  );
}
