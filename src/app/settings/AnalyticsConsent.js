/**
 * Copyright (C) 2024 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import * as l10n from '../../lib/l10n';

l10n.register([
  'analytics_interstitial_header',
  'analytics_consent_interstitial_message',
  'analytics_consent_interstitial_learn_more',
  'dialog_no_button',
  'dialog_yes_button',
]);

export default class AnalyticsConsent extends React.Component {
  dummy() {
    return true;
  }

  render() {
    return (
      <div className="jumbotron">
        <section className="card  text-center">
          <div className="container">
            <div className=" row justify-content-center">
              <div className=" round-container  d-flex justify-content-center align-items-center ">
                <img className="img-fluid" src="/img/hands.svg" />
              </div>
            </div>
          </div>
          <div className="container">
            <div className=" row justify-content-center">
              <h2 className="text-center ">{l10n.map.analytics_interstitial_header}</h2>
              <p className="text-center mr-auto">{l10n.map.analytics_consent_interstitial_message}</p>
              <button className="btn btn-consent mx-2" type="button">{l10n.map.dialog_no_btn}</button>
              <button className="btn btn-consent mx-2" type="button">{l10n.map.dialog_yes_btn}</button>
            </div>
          </div>
          <a className="" data-toggle="collapse" data-target="#learnhow">{l10n.map.analytics_consent_interstitial_learn_more}</a>
          <div id="learnhow" className="collapse">
            <div className="card card-body">
              <p>Insert copy here</p>
            </div>
          </div>
        </section>
      </div>
    );
  }
}
