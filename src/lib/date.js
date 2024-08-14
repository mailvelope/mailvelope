/**
 * Copyright (C) 2024 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */
/**
 * date-fns helper functions
 */
import {format} from 'date-fns';

// we use dymanic import here which makes webpack local ALL locales
// but later we filter out only used locales in webpack
/**
 * Loads locale from `date-fns` dynamically
 * @param {string} locale - locale string to load from `date-fns`
 * @returns {Locale} `date-fns/Locale` object
 */
export function loadLocale(locale) {
  // using alias to workaround https://github.com/webpack/webpack/issues/13865
  return import(`date-fns-locale/locale/${locale}.mjs`);
}

/**
 * Call's `date-fns/format` and loads a locale specified
 * @param {Date | number | string} date - a date to format
 * @param {string} formatStyle - a format string (eg 'DD.MM.YYY')
 * @param {Locale} locale - date-fns locale object
 * @returns {string} formatted string
 */
export function formatDate(date, formatStyle, locale) {
  return format(date, formatStyle, {
    locale: loadLocale(locale).default,
  });
}
