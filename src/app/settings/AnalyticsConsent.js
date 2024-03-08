/**
 * Copyright (C) 2024 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import * as l10n from '../../lib/l10n';

l10n.register([

]);

export default class AnalyticsConsent extends React.Component {
  randomizeParticipation() {
    return true;
  }

  render() {
    return (
      <div className="jumbotron">
        <section className="card">
          Hello I am the consent page
        </section>
      </div>
    );
  }
}
