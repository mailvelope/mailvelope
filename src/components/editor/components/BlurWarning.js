/**
 * Copyright (C) 2017 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import $ from 'jquery';
import * as l10n from '../../../lib/l10n';

l10n.register([
  'editor_blur_warn'
]);

export default class BlurWarning extends React.Component {
  constructor() {
    super();
    // ref to blur warning
    this.blurWarn = null;
    // timeoutID for period in which blur events are monitored
    this.blurWarnPeriod = null;
    // timeoutID for period in which blur events are non-critical
    this.blurValid = null;
    // observe window for getting focus
    $(window).on('focus', () => this.startBlurValid());
  }

  startBlurWarnInterval() {
    if (this.blurWarnPeriod) {
      // clear timeout
      window.clearTimeout(this.blurWarnPeriod);
    }
    // restart
    this.blurWarnPeriod = window.setTimeout(() => this.blurWarnPeriod = null, 2000);
  }

  /*
   blur warning displayed if blur occurs:
   - inside blur warning period (2s after input)
   - not within 40ms after keydown event (text editor)
   - not within 40ms before focus event (window, modal)
  */
  onBlur() {
    if (this.blurWarnPeriod && !this.blurValid) {
      window.setTimeout(() => this.showBlurWarning(), 40);
    }
  }

  showBlurWarning() {
    const blurWarn = $(this.blurWarn);
    if (!this.blurValid) {
      // fade in 600ms, wait 200ms, fade out 600ms
      blurWarn.removeClass('hide')
      .stop(true)
      .animate({opacity: 1}, 'slow', 'swing', () => {
        setTimeout(() => {
          blurWarn.animate({opacity: 0}, 'slow', 'swing', () => {
            blurWarn.addClass('hide');
          });
        }, 200);
      });
    }
  }

  startBlurValid() {
    if (this.blurValid) {
      // clear timeout
      window.clearTimeout(this.blurValid);
    }
    // restart
    this.blurValid = window.setTimeout(() => this.blurValid = null, 40);
  }

  render() {
    return (
      <div ref={node => this.blurWarn = node} className="alert alert-warning hide" style={{opacity: 0, position: 'absolute', top: '200px', left: '50%', marginLeft: '-240px'}}>
        <h3>{l10n.map.editor_blur_warn}</h3>
      </div>
    );
  }
}
