/**
 * Copyright (C) 2024 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */
/**
 * date-fns helper functions
 */
// we use dymanic import here which makes webpack local ALL locales
// but later we filter out only used locales in webpack
const localeCache = {};
/**
 * Loads locale from `date-fns` dynamically
 * @param {string} language - language string to load from `date-fns`
 * @returns {Locale} `date-fns/Locale` object
 */
export async function loadLocale(language) {
  if (!localeCache[language]) {
    localeCache[language] = (await import(`date-fns-locale/locale/${language}.mjs`)).default;
  }
  // using alias to workaround https://github.com/webpack/webpack/issues/13865
  return localeCache[language];
}
