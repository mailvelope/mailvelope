/**
 * Copyright (C) 2026 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

/**
 * Browser detection: use manifest structure if available, default to Chrome if in offscreen context (unavailable getManifest)
 */
export const isFirefox = Boolean(chrome.runtime.getManifest?.()?.browser_specific_settings?.gecko);
export const isChrome = !isFirefox;
