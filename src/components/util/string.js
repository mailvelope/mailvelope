/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';

/**
 * Replace placeholders in a text with JSX fragments.
 * The placeholders should match the regex : ##\d+##
 * The placeholders numbering system starts at 1.
 *
 * @param {string} text The text to work with.
 * @param {Array<JSX>} jsxReplacements An array of JSX fragments to use as replacements.
 * @returns {Array<JSX>}
 */
export function replaceJsxPlaceholders(text, jsxReplacements) {
  return text.split(/(##\d+##)/)
  .reduce((output, part, position) => {
    const matches = part.match(/##(\d+)##/);
    if (matches) {
      output.push(<span key={position}>{jsxReplacements[matches[1] - 1]}</span>);
    } else {
      output.push(part);
    }
    return output;
  }, []);
}
