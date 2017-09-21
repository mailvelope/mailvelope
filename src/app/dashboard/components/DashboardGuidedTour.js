/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import * as l10n from '../../../lib/l10n';
import GuidedTour from '../../../components/guided-tour/GuidedTour';

l10n.register([
  'dashboard_tour_got_it_button',
  'dashboard_tour_step_1_text',
  'dashboard_tour_step_1_title'
]);

export default class DashboardGuidedTour extends GuidedTour {
  constructor(props) {
    super(props);

    // Init the dashboard tour steps.
    this.tour.addStep('step-1', {
      title: l10n.map.dashboard_tour_step_1_title,
      text: l10n.map.dashboard_tour_step_1_text,
      attachTo: '.dashboard-item-configure right',
      buttons: [{
        text: l10n.map.dashboard_tour_got_it_button,
        classes: 'shepherd-button-primary',
        action: this.tour.cancel
      }]
    });
  }
}
