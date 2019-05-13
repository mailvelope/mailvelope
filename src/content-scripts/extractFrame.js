/**
 * Copyright (C) 2013-2016 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {getHash, normalizeArmored} from '../lib/util';
import {LARGE_FRAME, FRAME_STATUS, FRAME_ATTACHED, FRAME_DETACHED} from '../lib/constants';
import EventHandler from '../lib/EventHandler';
import {currentProvider} from './main';

export default class ExtractFrame {
  constructor() {
    this.id = getHash();
    // range element with armored message
    this.pgpRange = null;
    // HTMLElement that contains complete ASCII Armored Message
    this.pgpElement = null;
    this.domIntersectionObserver = null;
    this.eFrame = null;
    this.port = null;
    this.currentProvider = currentProvider;
    this.clickHandler = this.clickHandler.bind(this);
    this.setFrameDim = this.setFrameDim.bind(this);
  }

  attachTo(pgpRange) {
    this.init(pgpRange);
    this.establishConnection();
    this.renderFrame();
    this.registerEventListener();
  }

  init(pgpRange) {
    this.pgpRange = pgpRange;
    // set container element
    this.pgpElement = document.createElement('div');
    this.pgpElement.classList.add('m-extract-wrapper');
    // set status to attached
    this.pgpElement.dataset[FRAME_STATUS] = FRAME_ATTACHED;
    // store frame obj in pgpText tag
    this.pgpElement.append(this.pgpRange.extractContents());
    this.pgpRange.insertNode(this.pgpElement);
    this.pgpRange.selectNodeContents(this.pgpElement);
  }

  establishConnection() {
    this.port = EventHandler.connect(this.ctrlName, this);
  }

  renderFrame() {
    this.eFrame = document.createElement('div');
    this.eFrame.id = `eFrame-${this.id}`;
    this.eFrame.innerHTML = '<a class="m-frame-close">×</a>';
    this.eFrame.classList.add('m-extract-frame', 'm-cursor');
    this.pgpElement.append(this.eFrame);
    if (this.pgpRange.getBoundingClientRect().height > LARGE_FRAME) {
      this.eFrame.classList.add('m-large');
    }
    this.eFrame.addEventListener('click', this.clickHandler);
    this.eFrame.querySelector('.m-frame-close').addEventListener('click', this.closeFrame.bind(this, false));
    window.addEventListener('resize', this.setFrameDim);
    this.domIntersectionObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.intersectionRatio > 0) {
          this.setFrameDim();
          this.eFrame.classList.remove('m-show');
          this.eFrame.classList.add('m-show');
        }
      }
    }, {root: this.pgpElement.parentNode});
    this.domIntersectionObserver.observe(this.pgpElement);
  }

  registerEventListener() {
    document.addEventListener('mailvelope-observe', this.setFrameDim);
    this.port.on('destroy', () => this.closeFrame(true));
    this.port.onDisconnect.addListener(() => this.closeFrame());
  }

  clickHandler(callback, ev) {
    this.eFrame.removeEventListener('click', this.clickHandler);
    this.toggleIcon(callback);
    this.eFrame.classList.remove('m-cursor');
    if (ev) {
      ev.stopPropagation();
    }
  }

  closeFrame(finalClose, ev) {
    this.eFrame.classList.remove('m-show');
    window.setTimeout(() => {
      this.domIntersectionObserver.disconnect();
      window.removeEventListener('resize', this.setFrameDim);
      this.eFrame.remove();
      if (finalClose === true) {
        this.port.disconnect();
        this.pgpElement.dataset[FRAME_STATUS] = '';
      } else {
        this.pgpElement.dataset[FRAME_STATUS] = FRAME_DETACHED;
      }
    }, 300);
    if (ev) {
      ev.stopPropagation();
    }
  }

  toggleIcon(callback) {
    this.eFrame.addEventListener('transitionend', callback, {once: true});
    this.eFrame.classList.toggle('m-open');
  }

  setFrameDim() {
    const boundingRect = this.pgpRange.getBoundingClientRect();
    this.eFrame.style.width = `${boundingRect.width}px`;
    this.eFrame.style.height = `${boundingRect.height}px`;
  }

  getArmoredMessage() {
    const pgpSelection = window.getSelection();
    // required in order to make Selection.addRange work
    pgpSelection.removeAllRanges();
    pgpSelection.addRange(this.pgpRange);
    const msg = pgpSelection.toString();
    pgpSelection.removeAllRanges();
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
