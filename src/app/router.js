/**
 * Mailvelope - secure email with OpenPGP encryption for Webmail
 * Copyright (C) 2017 Mailvelope GmbH
 */

import React from 'react';
import ReactDOM from 'react-dom';
import {HashRouter} from 'react-router-dom';
import {App} from './app';

document.addEventListener('DOMContentLoaded', init);

function init() {
  if (document.body.dataset.mvelo) {
    return;
  }
  document.body.dataset.mvelo = true;
  const root = document.createElement('div');
  ReactDOM.render((
    <HashRouter>
      <App />
    </HashRouter>
  ), document.body.appendChild(root));
}
