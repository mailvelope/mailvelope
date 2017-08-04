/**
 * Copyright (C) 2013-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

'use strict';

import mvelo from '../mvelo';
import $ from 'jquery';
import {currentProvider} from './main';

export default class ExtractFrame {
  constructor() {
    this.id = mvelo.util.getHash();
    // element with Armor Tail Line '-----END PGP...'
    this._pgpEnd = null;
    // element that contains complete ASCII Armored Message
    this._pgpElement = null;
    this._pgpElementAttr = {};
    this._eFrame = null;
    this._port = null;
    this._refreshPosIntervalID = null;
    this._pgpStartRegex = /BEGIN\sPGP/;
    this._currentProvider = currentProvider;
  }

  attachTo(pgpEnd) {
    this._init(pgpEnd);
    this._establishConnection();
    this._renderFrame();
    this._registerEventListener();
  }

  _init(pgpEnd) {
    this._pgpEnd = pgpEnd;
    // find element with complete armored text and width > 0
    this._pgpElement = pgpEnd;
    let maxNesting = 8;
    let beginFound = false;
    for (let i = 0; i < maxNesting; i++) {
      if (this._pgpStartRegex.test(this._pgpElement.text()) &&
          this._pgpElement.width() > 0) {
        beginFound = true;
        break;
      }
      this._pgpElement = this._pgpElement.parent();
      if (this._pgpElement.get(0).nodeName === 'HTML') {
        break;
      }
    }
    // set status to attached
    this._pgpEnd.data(mvelo.FRAME_STATUS, mvelo.FRAME_ATTACHED);
    // store frame obj in pgpText tag
    this._pgpEnd.data(mvelo.FRAME_OBJ, this);

    if (!beginFound) {
      throw new Error('Missing BEGIN PGP header.');
    }

    this._pgpElementAttr.marginTop = parseInt(this._pgpElement.css('margin-top'), 10);
    this._pgpElementAttr.paddingTop = parseInt(this._pgpElement.css('padding-top'), 10);
    this._pgpElementAttr.marginLeft = parseInt(this._pgpElement.css('margin-left'), 10);
    this._pgpElementAttr.paddingLeft = parseInt(this._pgpElement.css('padding-left'), 10);
  }

  _renderFrame() {
    this._eFrame = $('<div/>', {
      id: `eFrame-${this.id}`,
      'class': 'm-extract-frame m-cursor',
      html: '<a class="m-frame-close">×</a>'
    });

    this._setFrameDim();

    this._eFrame.insertAfter(this._pgpElement);
    if (this._pgpElement.height() > mvelo.LARGE_FRAME) {
      this._eFrame.addClass('m-large');
    }
    this._eFrame.fadeIn('slow');

    this._eFrame.on('click', this._clickHandler.bind(this));
    this._eFrame.find('.m-frame-close').on('click', this._closeFrame.bind(this));

    $(window).resize(this._setFrameDim.bind(this));
    this._refreshPosIntervalID = window.setInterval(() => this._setFrameDim(), 1000);
  }

  _clickHandler(callback) {
    this._eFrame.off('click');
    this._toggleIcon(callback);
    this._eFrame.removeClass('m-cursor');
    return false;
  }

  _closeFrame(finalClose) {
    this._eFrame.fadeOut(() => {
      window.clearInterval(this._refreshPosIntervalID);
      $(window).off('resize');
      this._eFrame.remove();
      if (finalClose === true) {
        this._port.disconnect();
        this._pgpEnd.data(mvelo.FRAME_STATUS, null);
      } else {
        this._pgpEnd.data(mvelo.FRAME_STATUS, mvelo.FRAME_DETACHED);
      }
      this._pgpEnd.data(mvelo.FRAME_OBJ, null);
    });
    return false;
  }

  _toggleIcon(callback) {
    this._eFrame.one('transitionend', callback);
    this._eFrame.toggleClass('m-open');
  }

  _setFrameDim() {
    let pgpElementPos = this._pgpElement.position();
    this._eFrame.width(this._pgpElement.width() - 2);
    this._eFrame.height(this._pgpEnd.position().top + this._pgpEnd.height() - pgpElementPos.top - 2);
    this._eFrame.css('top', pgpElementPos.top + this._pgpElementAttr.marginTop + this._pgpElementAttr.paddingTop);
    this._eFrame.css('left', pgpElementPos.left + this._pgpElementAttr.marginLeft + this._pgpElementAttr.paddingLeft);
  }

  _establishConnection() {
    this._port = mvelo.extension.connect({name: this._ctrlName});
    //console.log('Port connected: %o', this._port);
  }

  _getArmoredMessage() {
    let msg;
    // selection method does not work in Firefox if pre element without linebreaks with <br>
    if (this._pgpElement.is('pre') && !this._pgpElement.find('br').length) {
      msg = this._pgpElement.text();
    } else {
      let element = this._pgpElement.get(0);
      let sel = element.ownerDocument.defaultView.getSelection();
      sel.selectAllChildren(element);
      msg = sel.toString();
      sel.removeAllRanges();
    }
    return msg;
  }

  _getPGPMessage() {
    let msg = this._getArmoredMessage();
    // additional filtering to get well defined PGP message format
    msg = mvelo.util.normalizeArmored(msg, this._typeRegex);
    return msg;
  }

  _getEmailSender() {
    return this._currentProvider.getSender(this._pgpElement);
  }

  _registerEventListener() {
    this._port.onMessage.addListener(msg => {
      switch (msg.event) {
        case 'destroy':
          this._closeFrame(true);
          break;
      }
    });
    this._port.onDisconnect.addListener(() => {
      this._closeFrame(false);
    });
  }
}
