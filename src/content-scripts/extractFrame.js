/**
 * Copyright (C) 2013-2019 Mailvelope GmbH
 * Licensed under the GNU Affero General Public License version 3
 */

import {getUUID, normalizeArmored, parseHTML} from '../lib/util';
import {LARGE_FRAME, FRAME_STATUS, FRAME_ATTACHED, FRAME_DETACHED} from '../lib/constants';
import EventHandler from '../lib/EventHandler';
import {currentProvider} from './main';

import encryptContainerCSS from './extractFrame.css';

export default class ExtractFrame {
  constructor() {
    this.id = getUUID();
    // range element with armored message
    this.pgpRange = null;
    // HTMLElement that contains complete ASCII Armored Message
    this.pgpElement = null;
    this.domIntersectionObserver = null;
    this.eFrame = null;
    this.shadowRootElem = null;
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
    // check if wrapper element already exists
    if (this.pgpRange.commonAncestorContainer.classList.contains('m-extract-wrapper')) {
      this.pgpElement = this.pgpRange.commonAncestorContainer;
    } else {
      // create container element
      this.pgpElement = document.createElement('div');
      this.pgpElement.classList.add('m-extract-wrapper');
      this.pgpElement.style.display = 'inline-block';
      this.pgpElement.style.position = 'relative';
      this.pgpElement.append(this.pgpRange.extractContents());
      this.pgpRange.insertNode(this.pgpElement);
      this.pgpRange.selectNodeContents(this.pgpElement);
    }
    // set status to attached
    this.pgpElement.dataset[FRAME_STATUS] = FRAME_ATTACHED;
  }

  establishConnection() {
    this.port = EventHandler.connect(this.ctrlName, this);
  }

  renderFrame() {
    this.eFrame = document.createElement('div');
    this.eFrame.id = `eFrame-${this.id}`;
    const closeButton = '<a class="m-frame-close">×</a>';
    this.eFrame.append(...parseHTML(closeButton));
    this.eFrame.classList.add('m-extract-frame', 'm-cursor');
    this.pgpElement.append(this.eFrame);
    if (this.pgpRange.getBoundingClientRect().height > LARGE_FRAME) {
      this.eFrame.classList.add('m-large');
    }
    this.eFrame.addEventListener('click', this.clickHandler);
    this.eFrame.querySelector('.m-frame-close').addEventListener('click', this.closeFrame.bind(this, false, false));
    this.shadowRootElem = document.createElement('div');
    this.pgpElement.append(this.shadowRootElem);
    const eFrameShadow = this.shadowRootElem.attachShadow({mode: 'open'});
    const encryptContainerStyle = document.createElement('style');
    encryptContainerStyle.textContent = encryptContainerCSS;
    eFrameShadow.append(encryptContainerStyle);
    eFrameShadow.append(this.eFrame);
    window.addEventListener('resize', this.setFrameDim);
    this.domIntersectionObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.intersectionRatio > 0  && entry.boundingClientRect.height > 72) {
          this.onShow();
        }
      }
    }, {root: null});
    this.domIntersectionObserver.observe(this.pgpElement);
  }

  registerEventListener() {
    document.addEventListener('mailvelope-observe', this.setFrameDim);
    this.port.on('destroy', () => this.closeFrame(true, true));
    this.port.onDisconnect.addListener(() => this.closeFrame(true, false));
  }

  clickHandler(callback, ev) {
    this.eFrame.removeEventListener('click', this.clickHandler);
    this.toggleIcon(callback);
    this.eFrame.classList.remove('m-cursor');
    if (ev) {
      ev.stopPropagation();
    }
  }

  onShow() {
    this.setFrameDim();
    this.eFrame.classList.remove('m-show');
    this.eFrame.classList.add('m-show');
  }

  closeFrame(reset, disconnect, ev) {
    this.eFrame.classList.remove('m-show');
    this.domIntersectionObserver.disconnect();
    window.removeEventListener('resize', this.setFrameDim);
    document.removeEventListener('mailvelope-observe', this.setFrameDim);
    window.setTimeout(() => {
      this.shadowRootElem.remove();
    }, 300);
    if (reset === true) {
      this.pgpElement.parentNode.prepend(this.pgpRange.extractContents());
      this.pgpElement.remove();
    } else {
      this.pgpElement.dataset[FRAME_STATUS] = FRAME_DETACHED;
    }
    if (disconnect === true) {
      this.port.disconnect();
    }
    if (ev instanceof Event) {
      ev.stopPropagation();
    }
  }

  toggleIcon(callback) {
    if (callback) {
      this.eFrame.addEventListener('transitionend', callback, {once: true});
    }
    this.eFrame.classList.toggle('m-open');
  }

  setFrameDim() {
    const {width, height} = this.pgpRange.getBoundingClientRect();
    this.eFrame.style.width = `${width}px`;
    this.eFrame.style.height = `${height}px`;
  }

  getArmoredMessage() {
    let msg;
    if (this.pgpElement.parentElement.tagName.toLowerCase() === 'pre' && !this.pgpElement.querySelectorAll('br').length) {
      msg = this.pgpRange.toString();
    } else {
      const pgpSelection = this.pgpElement.ownerDocument.getSelection();
      // required in order to make Selection.addRange work
      pgpSelection.removeAllRanges();
      pgpSelection.addRange(this.pgpRange);
      msg = pgpSelection.toString();
      pgpSelection.removeAllRanges();
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
