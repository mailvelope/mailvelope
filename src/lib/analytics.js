/**
 * Copyright (C) 2022 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {CleanInsights} from 'clean-insights-sdk';
import {matchPattern2RegEx} from './util';
import mvelo from './lib-mvelo';
import defaults from '../res/defaults.json';

export const PROVIDER_CAMPAIGN = 'provider';
const NON_DEFAULT_PROVIDER = 'Non-default Provider';
const PROVIDER_SCENE_PATH = 'webmail provider';

export const ONBOARDING_CAMPAIGN = 'onboarding';
const ONBOARDING_CATEGORY = 'onboarding';
// DO NOT DEPLOY: Change to 1% for deployement.
export const PERCENT_OF_ONBOARDERS_TO_PROMPT = 100;

export const ci = new CleanInsights({
  'server': 'https://metrics.cleaninsights.org/cleaninsights.php',
  // DO NOT DEPLOY: Testing ID
  'siteId': 37,  // Mailvelope's site ID on Clean Insights Matomo instance.
  'persistEveryNTimes': 1,
  'debug': false,
  'campaigns': {
    [PROVIDER_CAMPAIGN]: {
      'start': '2022-02-01T00:00:00-00:00',
      'end': '2023-01-31T23:59:59-00:00',
      'aggregationPeriodLength': 7, // days
      'numberOfPeriods': 53,
      // Record which sites are used each day.  Subsequent same-day visits aren't interesting.
      'onlyRecordOnce': true,
    },
    [ONBOARDING_CAMPAIGN]: {
      'start': '2024-03-01T00:00:00-00:00',
      'end': '2024-12-31T23:59:59-00:00',
      'aggregationPeriodLength': 1, // days
      'numberOfPeriods': 30,
      // We only care *that* a step was completed, not e.g. how many times you decrypted a message.
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
  let measured = false;
  defaults.watch_list.forEach(site => {
    site.frames.forEach(frame => {
      const re = matchPattern2RegEx(frame.frame);
      if (re.test(mvelo.util.getDomain(url))) {
        ci.measureVisit([PROVIDER_SCENE_PATH, site.site, frame.frame], PROVIDER_CAMPAIGN);
        measured = true;
      }
    });
  });
  // When the script was injected, but not into a default site, do not disclose *which* site,
  // but do record that some non-default site was visited.
  if (!measured) {
    ci.measureVisit([PROVIDER_SCENE_PATH, NON_DEFAULT_PROVIDER], PROVIDER_CAMPAIGN);
  }
}

export function measureOnboardingStep(step) {
  ci.measureEvent(ONBOARDING_CATEGORY, step, ONBOARDING_CAMPAIGN);
  console.log('measured onboarding step:', step);
}
