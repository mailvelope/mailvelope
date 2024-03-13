/**
 * Copyright (C) 2022 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {BrowserStore, CleanInsights} from 'clean-insights-sdk';
import {matchPattern2RegEx} from './util';
import mvelo from './lib-mvelo';
import defaults from '../res/defaults.json';

export const PROVIDER_CAMPAIGN = 'provider';
const NON_DEFAULT_PROVIDER = 'Non-default Provider';
const PROVIDER_SCENE_PATH = 'webmail provider';

export const ONBOARDING_CAMPAIGN = 'onboarding';
const ONBOARDING_CATEGORY = 'onboarding';
export const LOAD_EXTENSION = 'Load Extension';
export const ADD_KEY = 'Added Key';
export const COMMUNIATION = 'Communication';
const ONBOARDING_STEPS = [
  LOAD_EXTENSION,
  ADD_KEY,
  COMMUNIATION,
];

// DO NOT DEPLOY: Change to 1% for deployement.
export const PERCENT_OF_ONBOARDERS_TO_PROMPT = 100;

// Add basic K:V storage so we can keep timestamps and deduplicate actions.
class BrowserStoreWithKV extends BrowserStore {
  constructor() {
    super();
    const data = this.load();
    if (data && data.kv) {
      this.kv = data.kv;
    }
  }

  setItem(key, value) {
    if (!this.kv) {
      this.kv = {};
    }
    this.kv[key] = value;
  }

  getItem(key) {
    if (!this.kv) {
      this.kv = {};
    }
    return this.kv[key];
  }
}

const store = new BrowserStoreWithKV();

export const ci = new CleanInsights(
  {
    'server': 'https://metrics.cleaninsights.org/cleaninsights.php',
    // DO NOT DEPLOY: Testing ID
    'siteId': 37,  // Mailvelope's site ID on Clean Insights Matomo instance.
    'persistEveryNTimes': 1,
    'debug': true, // DO NOT DEPLOY: Debug off for deployment.
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
      },
    }
  },
  store
);

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

/* Record that an onboarding step was completed and how long it's been since the first time the
 * previous step was completed.
 *
 * Pre-requisite actions are listed in ONBOARDING_STEPS.  Names capture the specific mechanism
 * used to perform the action e.g. "Generate" or "Import".
 */
export function recordOnboardingStep(action, name) {
  const this_action_already_recorded = store.getItem(action) !== undefined;
  const this_step_performed_at = Date.now();
  if (!this_action_already_recorded) {
    // Save the timestamp of the first time this action was performed.
    store.setItem(action, this_step_performed_at);
  }
  const last_step_timestamp = store.getItem(ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(action) - 1]);
  let elapsed = null;
  if (last_step_timestamp) {
    elapsed = (this_step_performed_at - last_step_timestamp) / 1000;  // Report seconds, not milliseconds.
  }
  
  // For this campaign, onlyRecordOnce isn't quite right.  We want to record once *ever*,
  // not once per aggregation period.  So we'll use the store to deduplicate.
  const can_tuple = [ONBOARDING_CATEGORY, action, name];
  if (!store.getItem(can_tuple)) {
    ci.measureEvent(ONBOARDING_CATEGORY, action, ONBOARDING_CAMPAIGN, name, elapsed);
    store.setItem(can_tuple, true);
    ci.persist();
  }
}
