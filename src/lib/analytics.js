/**
 * Copyright (C) 2022 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {CleanInsights} from 'clean-insights-sdk';
import {matchPattern2RegEx} from './util';
import mvelo from './lib-mvelo';
import defaults from '../res/defaults.json';

export const PROVIDER_CAMPAIGN = 'provider';

export const ci = new CleanInsights({
  'server': 'https://metrics.cleaninsights.org/cleaninsights.php',
  'siteId': 22,  // Mailvelope's site ID on Clean Insights Matomo instance.
  'persistEveryNTimes': 1,
  'debug': true,
  'campaigns': {
    [PROVIDER_CAMPAIGN]: {
      'start': '2022-01-01T00:00:00-00:00',
      'end': '2022-12-31T23:59:59-00:00',
      'aggregationPeriodLength': 1, // days
      'numberOfPeriods': 365,
      // Record which sites are used each day.  Subsequent same-day visits aren't interesting.
      'onlyRecordOnce': true,
    },
  }
});

/* Record a hit to a domain in the watchList (i.e. where the mvelo content script was injected).
 *
 * To preserve privacy, we record only the matching site & frame and discard the remaining
 * information in the URL.
 */
export function measureWatchListHit(url) {
  defaults.watch_list.forEach(site => {
    site.frames.forEach(frame => {
      const re = matchPattern2RegEx(frame.frame);
      if (re.test(mvelo.util.getDomain(url))) {
        ci.measureVisit([site.site, frame.frame], PROVIDER_CAMPAIGN);
      }
    });
  });
}
