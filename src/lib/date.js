/**
 * Copyright (C) 2024 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */
/**
 * date-fns helper functions
 */
import * as locales from 'date-fns/locale';
/**
 * Loads locale from `date-fns`
 * @param {string} language - language string to load from `date-fns`
 * @returns {import('date-fns').Locale} `date-fns/Locale` object
 */
export function getLocale(language) {
  return locales[language.replace('-', '')];
}
