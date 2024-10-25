/**
 * Copyright (C) 2022 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {BrowserStore, CleanInsights, ConsentState} from 'clean-insights-sdk';

export const KEYSERVER_ADDRESS = 'noreply@mailvelope.com';
export const ONBOARDING_CAMPAIGN_ID = 'onboarding';
export const BEGIN = 'Load Extension';
export const ADD_KEY = 'Added Key';
export const COMMUNICATION = 'Communication';

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

class OnboardingCampaign {
  static CATEGORY =  'onboarding';
  static #SELECTED_FOR_EXPERIMENT_KEY = 'Selected for Onboarding Experiment';
  static #PERCENT_OF_ONBOARDERS_TO_PROMPT = 0;
  static TRACKTYPES = {
    FIRST_PER_ACTION: 'first per action',
    FIRST_PER_NAME: 'first per name',
  };
  static STEPS = [
    {
      name: BEGIN,
      trackType: this.TRACKTYPES.FIRST_PER_ACTION,
    },
    {
      name: ADD_KEY,
      trackType: this.TRACKTYPES.FIRST_PER_ACTION,
    },
    {
      name: COMMUNICATION,
      trackType: this.TRACKTYPES.FIRST_PER_NAME,
    },
  ];
  #ci;
  #store;
  static #_instance;

  constructor(store) {
    if (OnboardingCampaign.#_instance) {
      return OnboardingCampaign.#_instance;
    }
    OnboardingCampaign.#_instance = this;

    this.#store = store;
  }

  get config() {
    return {
      'start': '2024-03-01T00:00:00-00:00',
      'end': '2024-12-31T23:59:59-00:00',
      'aggregationPeriodLength': 1, // days
      'numberOfPeriods': 30,
    };
  }

  set cleanInsights(ci) {
    this.#ci = ci;
  }

  #getStep(action) {
    return OnboardingCampaign.STEPS.find(step => step.name === action);
  }

  #getPrecedingStep(action) {
    const index = OnboardingCampaign.STEPS.indexOf(this.#getStep(action));
    return index > 0 ? OnboardingCampaign.STEPS[index - 1] : null;
  }

  /* Record that an onboarding step was completed and how long it's been since the first time the
  * previous action was completed.
  *
  * Pre-requisite actions are listed in ONBOARDING_STEPS.  Names capture the specific mechanism
  * used to perform the action e.g. "Generate" or "Import".  The same action will be recorded once
  * for each unique name.
  */
  recordOnboardingStep(action, name) {
    if (!this.#ci || !this.#store) {
      return;
    }
    const this_step_performed_at = Date.now();
    const last_step = this.#getPrecedingStep(action);
    const last_step_timestamp = last_step && this.#store.get(last_step.name);
    let elapsed = null;
    if (last_step_timestamp) {
      elapsed = (this_step_performed_at - last_step_timestamp);  // Report seconds, not milliseconds.
      elapsed = binInto10sIncrements(elapsed);
    }

    if (this.#store.get(action) === undefined) {
      // Save the timestamp of the first time this action was performed.
      this.#store.set(action, this_step_performed_at);
    } else if (this.#getStep(action).trackType === OnboardingCampaign.TRACKTYPES.FIRST_PER_ACTION) {
      return;
    }

    // Never record a category, action, name tuple more than once.
    const can_tuple = [OnboardingCampaign.CATEGORY, action, name];
    if (!this.#store.get(can_tuple)) {
      this.#ci.measureEvent(OnboardingCampaign.CATEGORY, action, ONBOARDING_CAMPAIGN_ID, name, elapsed);
      this.#store.set(can_tuple, true);
      this.#ci.persist();
    }
  }

  #isSelectedForExperiment() {
    let selected = this.#store.get(OnboardingCampaign.#SELECTED_FOR_EXPERIMENT_KEY);
    if (selected === undefined) {
      selected = Math.random() < (OnboardingCampaign.#PERCENT_OF_ONBOARDERS_TO_PROMPT / 100);
      this.#store.set(OnboardingCampaign.#SELECTED_FOR_EXPERIMENT_KEY, selected);
      this.#ci.persist();
    }
    return selected;
  }

  /* Decide once whether the user is selected for the experiment.  If they're selected and
  * haven't yet responded to the consent dialog, show it.
  */
  shouldSeeConsentDialog() {
    if (!this.#ci || !this.#store) {
      return false;
    }
    const hasResponded = this.#ci.stateOfCampaign(ONBOARDING_CAMPAIGN_ID) !== ConsentState.unknown;
    return this.#isSelectedForExperiment() && !hasResponded;
  }
}

export class Analytics {
  static #instance;
  #isEnabled = false;
  #ci;
  #store;
  #campaigns = new Map();

  constructor() {
    if (Analytics.#instance) {
      return Analytics.#instance;
    }
    Analytics.#instance = this;
    this.#store = new BrowserStoreWithKV();
  }

  // we defer initialization until all campaigns are registered
  #initCleanInsights() {
    const campaignsObject = Object.fromEntries(
      Array.from(this.#campaigns).map(([key, campaign]) => [key, campaign.config])
    );
    const ci = new CleanInsights(
      {
        'server': 'https://metrics.cleaninsights.org/cleaninsights.php',
        'siteId': 22,
        'persistEveryNTimes': 1,
        'campaigns': campaignsObject,
      },
      this.#store
    );
    // By calling this when the extension is initialized, we can make sure we
    // flush the last events out.
    ci.persistAndSend();

    // not we set the CleanInsights instance on all campaigns
    this.#campaigns.forEach(campaign => campaign.cleanInsights = ci);

    this.#ci = ci;
  }

  addOnboardingCampaign() {
    this.#campaigns.set(ONBOARDING_CAMPAIGN_ID, new OnboardingCampaign(this.#store));
    return this; // allow chaining
  }

  getOnboardingCampaign() {
    return this.#campaigns.get(ONBOARDING_CAMPAIGN_ID);
  }

  grantCampaign(campaignId) {
    if (!this.#isEnabled()) {
      return;
    }
    this.#ci.grantCampaign(campaignId);
  }

  denyCampaign(campaignId) {
    if (!this.#isEnabled()) {
      return;
    }
    this.#ci.denyCampaign(campaignId);
  }

  enable() {
    this.#isEnabled = true;
    // only initialize CleanInsights when enabled
    this.#initCleanInsights();
    return this; // allow chaining
  }

  isCampaignCurrentlyGranted(campaignId) {
    if (!this.#isEnabled()) {
      return false;
    }
    return this.#ci.isCampaignCurrentlyGranted(campaignId);
  }
}

export function initAnalytics() {
  new Analytics().addOnboardingCampaign();
}

export function binInto10sIncrements(milliseconds) {
  return Math.floor(milliseconds / (10 * 1000)) * 10;
}
