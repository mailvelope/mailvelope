/**
 * Copyright (C) 2013-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {getHash, normalizeArmored} from '../lib/util';
import {LARGE_FRAME, FRAME_STATUS, FRAME_ATTACHED, FRAME_DETACHED, FRAME_OBJ} from '../lib/constants';
import EventHandler from '../lib/EventHandler';
import $ from 'jquery';
import {currentProvider} from './main';

export default class ExtractFrame {
  constructor() {
    this.id = getHash();
    // element with Armor Tail Line '-----END PGP...'
    this.pgpEnd = null;
    // element that contains complete ASCII Armored Message
    this.pgpElement = null;
    this.pgpElementAttr = {};
    this.eFrame = null;
    this.port = null;
    this.refreshPosIntervalID = null;
    this.pgpStartRegex = /BEGIN\sPGP/;
    this.currentProvider = currentProvider;
  }

  attachTo(pgpEnd) {
    this.init(pgpEnd);
    this.establishConnection();
    this.renderFrame();
    this.registerEventListener();
  }

  init(pgpEnd) {
    this.pgpEnd = pgpEnd;
    // find element with complete armored text and width > 0
    this.pgpElement = pgpEnd;
    const maxNesting = 8;
    let beginFound = false;
    for (let i = 0; i < maxNesting; i++) {
      if (this.pgpStartRegex.test(this.pgpElement.text()) &&
          this.pgpElement.width() > 0) {
        beginFound = true;
        break;
      }
      this.pgpElement = this.pgpElement.parent();
      if (this.pgpElement.get(0).nodeName === 'HTML') {
        break;
      }
    }
    // set status to attached
    this.pgpEnd.data(FRAME_STATUS, FRAME_ATTACHED);
    // store frame obj in pgpText tag
    this.pgpEnd.data(FRAME_OBJ, this);
    if (!beginFound) {
      throw new Error('Missing BEGIN PGP header.');
    }
    this.pgpElementAttr.marginTop = parseInt(this.pgpElement.css('margin-top'), 10);
    this.pgpElementAttr.paddingTop = parseInt(this.pgpElement.css('padding-top'), 10);
    this.pgpElementAttr.marginLeft = parseInt(this.pgpElement.css('margin-left'), 10);
    this.pgpElementAttr.paddingLeft = parseInt(this.pgpElement.css('padding-left'), 10);
  }

  establishConnection() {
    this.port = EventHandler.connect(this.ctrlName, this);
  }

  renderFrame() {
    this.eFrame = $('<div/>', {
      id: `eFrame-${this.id}`,
      'class': 'm-extract-frame m-cursor',
      html: '<a class="m-frame-close">×</a>'
    });
    this.setFrameDim();
    this.eFrame.insertAfter(this.pgpElement);
    if (this.pgpElement.height() > LARGE_FRAME) {
      this.eFrame.addClass('m-large');
    }
    this.eFrame.fadeIn('slow');
    this.eFrame.on('click', this.clickHandler.bind(this));
    this.eFrame.find('.m-frame-close').on('click', this.closeFrame.bind(this));
    $(window).resize(this.setFrameDim.bind(this));
    this.refreshPosIntervalID = window.setInterval(() => this.setFrameDim(), 1000);
  }

  registerEventListener() {
    this.port.on('destroy', () => this.closeFrame(true));
    this.port.onDisconnect.addListener(() => this.closeFrame(false));
  }

  clickHandler(callback) {
    this.eFrame.off('click');
    this.toggleIcon(callback);
    this.eFrame.removeClass('m-cursor');
    return false;
  }

  closeFrame(finalClose) {
    this.eFrame.fadeOut(() => {
      window.clearInterval(this.refreshPosIntervalID);
      $(window).off('resize');
      this.eFrame.remove();
      if (finalClose === true) {
        this.port.disconnect();
        this.pgpEnd.data(FRAME_STATUS, null);
      } else {
        this.pgpEnd.data(FRAME_STATUS, FRAME_DETACHED);
      }
      this.pgpEnd.data(FRAME_OBJ, null);
    });
    return false;
  }

  toggleIcon(callback) {
    this.eFrame.one('transitionend', callback);
    this.eFrame.toggleClass('m-open');
  }

  setFrameDim() {
    const pgpElementPos = this.pgpElement.position();
    this.eFrame.width(this.pgpElement.width() - 2);
    this.eFrame.height(this.pgpEnd.position().top + this.pgpEnd.height() - pgpElementPos.top - 2);
    this.eFrame.css('top', pgpElementPos.top + this.pgpElementAttr.marginTop + this.pgpElementAttr.paddingTop);
    this.eFrame.css('left', pgpElementPos.left + this.pgpElementAttr.marginLeft + this.pgpElementAttr.paddingLeft);
  }

  getArmoredMessage() {
    let msg;
    // selection method does not work in Firefox if pre element without linebreaks with <br>
    if (this.pgpElement.is('pre') && !this.pgpElement.find('br').length) {
      msg = this.pgpElement.text();
    } else {
      const element = this.pgpElement.get(0);
      const sel = element.ownerDocument.defaultView.getSelection();
      sel.selectAllChildren(element);
      msg = sel.toString();
      sel.removeAllRanges();
    }
    return msg;
  }

  getPGPMessage() {
    let msg = this.getArmoredMessage();
    // additional filtering to get well defined PGP message format
    msg = normalizeArmored(msg, this.typeRegex);
    return msg;
  }

  getEmailSender() {
    return this.currentProvider.getSender(this.pgpElement);
  }
}
