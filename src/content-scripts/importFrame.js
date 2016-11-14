/**
 * Copyright (C) 2013-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';

import ExtractFrame from './extractFrame';


export default class ImportFrame extends ExtractFrame {
  constructor(prefs) {
    super(prefs);
    this._ctrlName = 'imFrame-' + this.id;
    this._typeRegex = /-----BEGIN PGP PUBLIC KEY BLOCK-----[\s\S]+?-----END PGP PUBLIC KEY BLOCK-----/;
  }

  _renderFrame() {
    super._renderFrame();
    this._eFrame.addClass('m-import');
  }

  _clickHandler() {
    super._clickHandler(() => {
      this._port.postMessage({
        event: 'imframe-armored-key',
        data: this._getPGPMessage(),
        sender: this._ctrlName
      });
    });
    return false;
  }

  _registerEventListener() {
    super._registerEventListener();
    this._port.onMessage.addListener(msg => {
      switch (msg.event) {
        case 'import-result':
          if (msg.resultType.error) {
            this._eFrame.addClass('m-error');
          } else if (msg.resultType.warning) {
            this._eFrame.addClass('m-warning');
          } else if (msg.resultType.success) {
            this._eFrame.addClass('m-ok');
          }
          break;
      }
    });
  }
}
