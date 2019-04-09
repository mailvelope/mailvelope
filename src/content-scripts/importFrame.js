/**
 * Copyright (C) 2013-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import ExtractFrame from './extractFrame';

export default class ImportFrame extends ExtractFrame {
  constructor() {
    super();
    this.ctrlName = `imFrame-${this.id}`;
  }

  renderFrame() {
    super.renderFrame();
    this.$eFrame.addClass('m-import');
  }

  clickHandler() {
    super.clickHandler(() => {
      this.port.emit('imframe-armored-key', {data: this.getPGPMessage()});
      this.$eFrame.addClass('m-ok');
    });
    return false;
  }
}
