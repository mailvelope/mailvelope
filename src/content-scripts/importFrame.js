/**
 * Copyright (C) 2013-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import ExtractFrame from './extractFrame';
import * as l10n from '../lib/l10n';

l10n.register([
  'import_frame_help_text'
]);

l10n.mapToLocal();

export default class ImportFrame extends ExtractFrame {
  constructor() {
    super();
    this.ctrlName = `imFrame-${this.id}`;
  }

  renderFrame() {
    super.renderFrame();
    const para = document.createElement('p');
    para.textContent = l10n.map.import_frame_help_text;
    this.eFrame.append(para);
    this.eFrame.classList.add('m-import');
  }

  clickHandler(ev) {
    // super.clickHandler(() => {
    //   console.log(this.getPGPMessage());
    //   this.port.emit('imframe-armored-key', {data: this.getPGPMessage()});
    //   this.eFrame.classList.add('m-ok');
    // }, ev);
    super.clickHandler(undefined, ev);
    this.port.emit('imframe-armored-key', {data: this.getPGPMessage()});
  }
}
