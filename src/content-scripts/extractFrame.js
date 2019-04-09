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
    // range element with armored message
    this.pgpRange = null;
    // Jquery element that contains complete ASCII Armored Message
    this.$pgpElement = null;
    this.pgpElementAttr = {};
    this.$eFrame = null;
    this.port = null;
    this.pgpStartRegex = /BEGIN\sPGP/;
    this.currentProvider = currentProvider;
  }

  attachTo(pgpRange) {
    this.init(pgpRange);
    this.establishConnection();
    this.renderFrame();
    this.registerEventListener();
  }

  init(pgpRange) {
    this.pgpRange = pgpRange;
    // get parent element of range elements
    this.$pgpElement = $(pgpRange.commonAncestorContainer);
    // set status to attached
    this.$pgpElement.data(FRAME_STATUS, FRAME_ATTACHED);
    // store frame obj in pgpText tag
    this.$pgpElement.data(FRAME_OBJ, this);
  }

  establishConnection() {
    this.port = EventHandler.connect(this.ctrlName, this);
  }

  renderFrame() {
    this.$eFrame = $('<div/>', {
      id: `eFrame-${this.id}`,
      'class': 'm-extract-frame m-cursor',
      html: '<a class="m-frame-close">×</a>'
    });
    this.setFrameDim();
    // should use a wrapper element instead, but breaks range object
    this.$pgpElement
    .addClass('m-extract-frame-wrapper')
    .append(this.$eFrame);

    if (this.pgpRange.getBoundingClientRect().height > LARGE_FRAME) {
      this.$eFrame.addClass('m-large');
    }
    this.$eFrame.fadeIn('slow');
    this.$eFrame.on('click', this.clickHandler.bind(this));
    this.$eFrame.find('.m-frame-close').on('click', this.closeFrame.bind(this));
    $(window).resize(this.setFrameDim.bind(this));
    this.domObserver = new MutationObserver(() => this.setFrameDim());
    this.domObserver.observe(document.body, {subtree: true, childList: true, characterData: true});
  }

  registerEventListener() {
    this.port.on('destroy', () => this.closeFrame(true));
    this.port.onDisconnect.addListener(() => this.closeFrame(false));
  }

  clickHandler(callback) {
    this.$eFrame.off('click');
    this.toggleIcon(callback);
    this.$eFrame.removeClass('m-cursor');
    return false;
  }

  closeFrame(finalClose) {
    this.$eFrame.fadeOut(() => {
      this.domObserver.disconnect();
      $(window).off('resize');
      this.$eFrame.remove();
      if (finalClose === true) {
        this.port.disconnect();
        this.$pgpElement.data(FRAME_STATUS, null);
      } else {
        this.$pgpElement.data(FRAME_STATUS, FRAME_DETACHED);
      }
      this.$pgpElement.data(FRAME_OBJ, null);
    });
    return false;
  }

  toggleIcon(callback) {
    this.$eFrame.one('transitionend', callback);
    this.$eFrame.toggleClass('m-open');
  }

  setFrameDim() {
    const boundingRect = this.pgpRange.getBoundingClientRect();
    this.$eFrame.width(boundingRect.width);
    this.$eFrame.height(boundingRect.height);
  }

  getArmoredMessage() {
    return this.pgpRange.toString();
  }

  getPGPMessage() {
    let msg = this.getArmoredMessage();
    // additional filtering to get well defined PGP message format
    msg = normalizeArmored(msg, this.typeRegex);
    return msg;
  }

  getEmailSender() {
    return this.currentProvider.getSender(this.$pgpElement);
  }
}
