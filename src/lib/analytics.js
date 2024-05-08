/**
 * Copyright (C) 2022 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {BrowserStore, CleanInsights, ConsentState} from 'clean-insights-sdk';

export const ONBOARDING_CAMPAIGN = 'onboarding';
export const BEGIN = 'Load Extension';
export const ADD_KEY = 'Added Key';
export const COMMUNICATION = 'Communication';
export const KEYSERVER_ADDRESS = 'noreply@mailvelope.com';

const TRACKTYPES = {
  FIRST_PER_ACTION: 'first per action',
  FIRST_PER_NAME: 'first per name',
};

const ONBOARDING_CATEGORY = 'onboarding';
const ONBOARDING_STEPS = [
  {
    name: BEGIN,
    trackType: TRACKTYPES.FIRST_PER_ACTION,
  },
  {
    name: ADD_KEY,
    trackType: TRACKTYPES.FIRST_PER_ACTION,
  },
  {
    name: COMMUNICATION,
    trackType: TRACKTYPES.FIRST_PER_NAME,
  },
];

const SELECTED_FOR_EXPERIMENT_KEY = 'Selected for Onboarding Experiment';
export const PERCENT_OF_ONBOARDERS_TO_PROMPT = 1;

// Add basic K:V storage so we can keep timestamps and deduplicate actions.
class BrowserStoreWithKV extends BrowserStore {
  constructor() {
    super();
    const data = this.load();
    if (data && data.kv) {
      this.kv = data.kv;
    } else {
      this.kv = {};
    }
  }

  set(key, value) {
    this.kv[key] = value;
  }

  get(key) {
    return this.kv[key];
  }
}

const store = new BrowserStoreWithKV();

export const ci = new CleanInsights(
  {
    'server': 'https://metrics.cleaninsights.org/cleaninsights.php',
    'siteId': 22,
    'persistEveryNTimes': 1,
    'campaigns': {
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
// By calling this when the extension is initialized, we can make sure we
// flush the last events out.
ci.persistAndSend();

export function binInto10sIncrements(milliseconds) {
  return Math.floor(milliseconds / (10 * 1000)) * 10;
}

function getStep(action) {
  return ONBOARDING_STEPS.find(step => step.name === action);
}

function getPrecedingStep(action) {
  const index = ONBOARDING_STEPS.indexOf(getStep(action));
  return index > 0 ? ONBOARDING_STEPS[index - 1] : null;
}

/* Record that an onboarding step was completed and how long it's been since the first time the
 * previous action was completed.
 *
 * Pre-requisite actions are listed in ONBOARDING_STEPS.  Names capture the specific mechanism
 * used to perform the action e.g. "Generate" or "Import".  The same action will be recorded once
 * for each unique name.
 */
export function recordOnboardingStep(action, name) {
  const this_step_performed_at = Date.now();
  const last_step = getPrecedingStep(action);
  const last_step_timestamp = last_step && store.get(last_step.name);
  let elapsed = null;
  if (last_step_timestamp) {
    elapsed = (this_step_performed_at - last_step_timestamp);  // Report seconds, not milliseconds.
    elapsed = binInto10sIncrements(elapsed);
  }

  if (store.get(action) === undefined) {
    // Save the timestamp of the first time this action was performed.
    store.set(action, this_step_performed_at);
  } else if (getStep(action).trackType === TRACKTYPES.FIRST_PER_ACTION) {
    return;
  }

  // Never record a category, action, name tuple more than once.
  const can_tuple = [ONBOARDING_CATEGORY, action, name];
  if (!store.get(can_tuple)) {
    ci.measureEvent(ONBOARDING_CATEGORY, action, ONBOARDING_CAMPAIGN, name, elapsed);
    store.set(can_tuple, true);
    ci.persist();
  }
}

/* Decide once whether the user is selected for the experiment.  If they're selected and
 * haven't yet responded to the consent dialog, show it.
 */
export function shouldSeeConsentDialog() {
  let selected = store.get(SELECTED_FOR_EXPERIMENT_KEY);
  if (selected === undefined) {
    selected = Math.random() < (PERCENT_OF_ONBOARDERS_TO_PROMPT / 100);
    store.set(SELECTED_FOR_EXPERIMENT_KEY, selected);
    ci.persist();
  }
  const hasResponded = ci.stateOfCampaign(ONBOARDING_CAMPAIGN) !== ConsentState.unknown;
  return selected && !hasResponded;
}
