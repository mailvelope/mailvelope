/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import ReactDOM from 'react-dom';
import * as l10n from '../../lib/l10n';
import {replaceJsxPlaceholders} from '../util/string';
import './InstallLandingPage.less';

l10n.register([
  'install_landing_page_getting_started',
  'install_landing_page_help',
  'install_landing_page_help_wrapper',
  'install_landing_page_welcome'
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
  const mailvelopeHelpUrl = "https://www.mailvelope.com/help";
  const iconPlaceholder = <span><img src="../../img/cryptography-icon48.png" height="25px"/></span>;
  const gettingStartedText = replaceJsxPlaceholders(l10n.map.install_landing_page_getting_started, [iconPlaceholder]);
  const helpLink = <a href={mailvelopeHelpUrl} rel="noreferrer noopener">{l10n.map.install_landing_page_help}</a>;
  const helpText = replaceJsxPlaceholders(l10n.map.install_landing_page_help_wrapper, [helpLink]);

  return (
    <div className="container">
      <nav className="navbar navbar-default navbar-fixed-top">
        <div className="container">
          <div className="navbar-header">
            <div className="navbar-brand settings-logo"></div>
          </div>
        </div>
      </nav>
      <div className="landing-page">
        <div className="col-md-10">
          <h1>{l10n.map.install_landing_page_welcome}</h1>
          <p>{gettingStartedText}</p>
          <p>{helpText}</p>
        </div>
        <div className="col-md-2">
          <div className="illustration"><i className="fa fa-arrow-up" aria-hidden="true"></i></div>
        </div>
      </div>
    </div>
  );
}
