/**
 * Copyright (C) 2017-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import React from 'react';
import * as l10n from '../../../lib/l10n';

l10n.register([
  'editor_blur_warn'
]);

export default class BlurWarning extends React.Component {
  constructor() {
    super();
    this.state = {showBlurWarning: false};
    // timeoutID for period in which the blur warning alert is visible
    this.blurWarnActive = null;
    // timeoutID for period in which blur events are monitored
    this.blurWarnPeriod = null;
    // timeoutID for period in which blur events are non-critical
    this.blurValid = null;
    // observe window for getting focus
    window.addEventListener('focus', () => this.startBlurValid());
  }

  startBlurWarnInterval() {
    if (this.blurWarnPeriod) {
      return;
    }
    this.blurWarnPeriod = setTimeout(() => this.blurWarnPeriod = null, 2000);
  }

  /*
   blur warning displayed if blur occurs:
   - inside blur warning period (2s after input)
   - not within 40ms after keydown event (text editor)
   - not within 40ms before focus event (window, modal)
  */
  onBlur() {
    if (this.blurWarnPeriod && !this.blurValid) {
      setTimeout(() => this.showBlurWarning(), 40);
    }
  }

  showBlurWarning() {
    if (this.blurValid) {
      return;
    }
    if (this.blurWarnActive) {
      clearTimeout(this.blurWarnActive);
    }
    this.setState({showBlurWarning: true});
    this.blurWarnActive = setTimeout(() => this.setState({showBlurWarning: false}), 800);
  }

  startBlurValid() {
    if (this.blurValid) {
      // clear timeout
      clearTimeout(this.blurValid);
    }
    // restart
    this.blurValid = setTimeout(() => this.blurValid = null, 40);
  }

  render() {
    if (!this.state.showBlurWarning) {
      return null;
    }
    return (
      <div className="alert alert-warning fade show" role="alert" style={{position: 'absolute', top: '300px', left: '50%', marginLeft: '-240px', zIndex: 1050}}>
        <h3>{l10n.map.editor_blur_warn}</h3>
      </div>
    );
  }
}
